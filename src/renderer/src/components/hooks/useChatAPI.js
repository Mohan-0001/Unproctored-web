import { useRef, useMemo, useCallback } from 'react'
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages'
import { createGeminiChat } from '../utils/model'
import { createChatGPTChat } from '../../react-agent/agents/chatgptAgent'
import { GEMINI_SYSTEM_PROMPT } from '../../react-agent/system_prompts/geminiPrompt'
import { CHATGPT_SYSTEM_PROMPT } from '../../react-agent/system_prompts/chatgptPrompt'
import { parseSlashCommand } from '../utils/agentRouter'
import { geminiPool, chatgptPool, isRateLimitError } from '../utils/keyPoolManager'

// ── History builder ───────────────────────────────────────────────────────────
/**
 * Build a LangChain message array from the flat shared conversation.
 * All prior messages from ALL agents are included so every model benefits
 * from full cross-agent context (shared memory).
 */
function buildHistory(systemPrompt, conversation, newUserMsg) {
  const history = [new SystemMessage(systemPrompt)]

  conversation.forEach((m) => {
    if (m.role === 'user') {
      const content = [{ type: 'text', text: m.text || 'Look at these images.' }]
      m.images?.forEach((img) =>
        content.push({ type: 'image_url', image_url: { url: img } })
      )
      history.push(new HumanMessage({ content }))
    } else if (m.role === 'ai') {
      history.push(new AIMessage(m.text || ''))
    }
  })

  const content = [{ type: 'text', text: newUserMsg.text || 'Analyse this.' }]
  newUserMsg.images?.forEach((img) =>
    content.push({ type: 'image_url', image_url: { url: img } })
  )
  history.push(new HumanMessage({ content }))
  return history
}

// ── Stream helpers ────────────────────────────────────────────────────────────

/** Pipe a LangChain stream into the last message in the messages array. */
async function drainStream(stream, setMessages) {
  let accumulated = ''
  for await (const chunk of stream) {
    accumulated += chunk.content
    setMessages((prev) => {
      const updated = [...prev]
      updated[updated.length - 1] = {
        ...updated[updated.length - 1],
        text: accumulated
      }
      return updated
    })
  }
}

/**
 * Generic pool-backed streaming call.
 * Tries keys in pool order. On 429 (up to MAX_ATTEMPTS = pool size) records
 * a strike and rotates; on success resets the key's strike count.
 *
 * @param {KeyPoolManager} pool
 * @param {Function}       createChat    - (key: string) => LangChain chat
 * @param {Array}          history       - LangChain messages array
 * @param {Function}       setMessages   - React setter
 * @param {number}         [attempt=0]
 */
async function streamWithPool(pool, createChat, history, setMessages, attempt = 0) {
  const poolSize = pool.snapshot.length
  if (attempt >= poolSize) {
    throw new Error(
      `All ${poolSize} API keys are rate-limited or exhausted. Please try again in a few minutes.`
    )
  }

  const slot = pool.getBestKey()
  if (!slot) throw new Error('No API keys configured for this agent.')

  try {
    const chat   = createChat(slot.key)
    const stream = await chat.stream(history)
    await drainStream(stream, setMessages)
    pool.recordSuccess(slot)
  } catch (err) {
    const is429 = isRateLimitError(err)
    pool.recordError(slot, is429)

    if (is429 && poolSize > 1) {
      console.warn(
        `[useChatAPI] 429 on key ${slot.key.slice(0, 6)}…, rotating (attempt ${attempt + 1}/${poolSize})`
      )
      return streamWithPool(pool, createChat, history, setMessages, attempt + 1)
    }
    throw err
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────
/**
 * useChatAPI — multi-agent dispatch with shared memory + smart key pool.
 *
 * @param {{
 *   geminiApiKeys:   string[],   // up to 4 Gemini keys
 *   openaiApiKeys:   string[],   // up to 4 OpenAI keys
 *   inputText:       string,
 *   screenshots:     string[],
 *   messages:        object[],
 *   setMessages:     function,
 *   setInputText:    function,
 *   setGhostText:    function,
 *   setScreenshots:  function,
 *   setIsStreaming:  function,
 *   onOpenSettings:  function,
 *   textareaRef:     React.ref
 * }}
 */
export function useChatAPI({
  geminiApiKeys,
  openaiApiKeys,
  inputText,
  screenshots,
  messages,
  setMessages,
  setInputText,
  setGhostText,
  setScreenshots,
  setIsStreaming,
  onOpenSettings,
  textareaRef
}) {

  // ── Sync pools using useMemo ───────────────────────────────────────────────
  const validGeminiKeys = useMemo(() => {
    const valid = (geminiApiKeys || []).filter((k) => k && k.trim())
    if (valid.length > 0) {
      geminiPool.setKeys(valid)
    }
    return valid
  }, [geminiApiKeys])

  const validOpenaiKeys = useMemo(() => {
    const valid = (openaiApiKeys || []).filter((k) => k && k.trim())
    if (valid.length > 0) {
      chatgptPool.setKeys(valid)
    }
    return valid
  }, [openaiApiKeys])

  // ── handleSend wrapped in useCallback ──────────────────────────────────────
  const handleSend = useCallback(async () => {
    if (!inputText.trim() && screenshots.length === 0) return

    // ── 1. Parse slash command ───────────────────────────────────────────────
    const { agent, cleanText } = parseSlashCommand(inputText)
    console.log('[useChatAPI] debug:', {
      inputText,
      agent,
      cleanText,
      geminiApiKeys,
      openaiApiKeys,
      validGeminiKeys,
      validOpenaiKeys
    })

    // ── 2. Guard: require at least one configured key ────────────────────────
    if (agent === 'gemini' && validGeminiKeys.length === 0) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          text: '⚠️ No Gemini API key configured. Please add one in Settings.',
          agent: 'gemini',
          timestamp: new Date().toISOString()
        }
      ])
      onOpenSettings()
      return
    }

    if (agent === 'chatgpt' && validOpenaiKeys.length === 0) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          text: '⚠️ No OpenAI API key configured. Please add one in Settings.',
          agent: 'chatgpt',
          timestamp: new Date().toISOString()
        }
      ])
      onOpenSettings()
      return
    }

    // ── 3. Compose user message (prefix already stripped by parseSlashCommand) ─
    const newUserMsg = {
      role:      'user',
      text:      cleanText,
      images:    screenshots,
      agent,
      timestamp: new Date().toISOString()
    }

    // ── 4. Optimistic UI update ──────────────────────────────────────────────
    setMessages((prev) => [...prev, newUserMsg])
    setInputText('')
    setGhostText('')
    setScreenshots([])
    setIsStreaming(true)
    window.api?.resetTypingBuffer()
    if (textareaRef.current) textareaRef.current.style.height = '44px'

    const aiPlaceholder = {
      role: 'ai',
      text: '',
      agent,
      timestamp: new Date().toISOString()
    }
    setMessages((prev) => [...prev, aiPlaceholder])

    try {
      // ── 5. Build shared history (full cross-agent context) ──────────────────
      const systemPrompt = agent === 'chatgpt' ? CHATGPT_SYSTEM_PROMPT : GEMINI_SYSTEM_PROMPT
      const history      = buildHistory(systemPrompt, messages, newUserMsg)

      // ── 6. Stream via pool (proactive + reactive 429 handling) ──────────────
      if (agent === 'chatgpt') {
        await streamWithPool(chatgptPool, createChatGPTChat, history, setMessages)
      } else {
        await streamWithPool(geminiPool, createGeminiChat, history, setMessages)
      }
    } catch (err) {
      console.error('[useChatAPI] fatal error:', err)
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          text: `⚠️ Error: ${err.message}`
        }
        return updated
      })
    } finally {
      setIsStreaming(false)
    }
  }, [
    inputText,
    screenshots,
    messages,
    validGeminiKeys,
    validOpenaiKeys,
    setMessages,
    setInputText,
    setGhostText,
    setScreenshots,
    setIsStreaming,
    onOpenSettings,
    textareaRef
  ])

  return { handleSend }
}
