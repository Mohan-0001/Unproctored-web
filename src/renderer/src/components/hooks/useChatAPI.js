import { useRef } from 'react'
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages'
import { createGeminiChat } from '../utils/model'
import { DSA_SYSTEM_PROMPT } from '../utils/systemPrompt'

export function useChatAPI({
  apiKeys,
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
  const keyIndexRef = useRef(0)

  async function handleSend() {
    
    if (!inputText.trim() && screenshots.length === 0) return

    
    const validKeys = (apiKeys || []).filter((k) => k && k.trim())

    if (validKeys.length === 0) {
      setMessages((prev) => [
        ...prev,
        { role: 'ai', text: '⚠️ Error: API key not set. Please configure your API key in Settings.' }
      ])
      onOpenSettings()
      return
    }

    
    const newUserMsg = { role: 'user', text: inputText, images: screenshots }

    
    setMessages((prev) => [...prev, newUserMsg])
    setInputText('')
    setGhostText('')
    setScreenshots([])
    setIsStreaming(true)
    window.api?.resetTypingBuffer()
    if (textareaRef.current) textareaRef.current.style.height = '44px'

    
    setMessages((prev) => [...prev, { role: 'ai', text: '' }])

    try {
      
      const history = [new SystemMessage(DSA_SYSTEM_PROMPT)]

      messages.forEach((m) => {
        if (m.role === 'user') {
          const content = [{ type: 'text', text: m.text || 'Look at these images.' }]
          m.images?.forEach((img) =>
            content.push({ type: 'image_url', image_url: { url: img } })
          )
          history.push(new HumanMessage({ content }))
        } else if (m.role === 'ai') {
          history.push(new AIMessage(m.text))
        }
      })

      
      const currentContent = [{ type: 'text', text: newUserMsg.text || 'Analyze this.' }]
      newUserMsg.images?.forEach((img) =>
        currentContent.push({ type: 'image_url', image_url: { url: img } })
      )
      history.push(new HumanMessage({ content: currentContent }))

      
      async function attemptStream(keyIndex, attemptsMade = 0) {
        if (attemptsMade >= validKeys.length) {
          throw new Error('All API keys are currently exhausted or rate limited. Please try again later.')
        }

        const currentKey = validKeys[keyIndex]
        keyIndexRef.current = keyIndex 

        try {
          
          const chat = createGeminiChat(currentKey)
          const stream = await chat.stream(history)
          
          let accumulated = ''
          for await (const chunk of stream) {
            accumulated += chunk.content
            setMessages((prev) => {
              const updated = [...prev]
              updated[updated.length - 1] = { ...updated[updated.length - 1], text: accumulated }
              return updated
            })
          }
        } catch (err) {
          const isRateLimitError = err?.status === 429 || err?.message?.includes('429') || err?.message?.includes('Quota')

          
          if (validKeys.length > 1 && isRateLimitError) {
            console.warn(`[useChatAPI] 429 Rate limit hit with key index ${keyIndex}, rotating to next API key...`)
            const nextKeyIndex = (keyIndex + 1) % validKeys.length
            return attemptStream(nextKeyIndex, attemptsMade + 1)
          }
          
          
          throw err
        }
      }

      
      const startIndex = keyIndexRef.current < validKeys.length ? keyIndexRef.current : 0
      await attemptStream(startIndex, 0)

    } catch (err) {
      console.error('[ChatUI] stream error:', err)
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          text: '⚠️ Error connecting to Gemini: ' + err.message
        }
        return updated
      })
    } finally {
      setIsStreaming(false)
    }
  }

  return { handleSend }
}
