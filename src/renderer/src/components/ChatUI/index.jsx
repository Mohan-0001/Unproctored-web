import { useState, useEffect, useRef, useCallback } from 'react'
import TopBar from './TopBar'
import MessageList from './MessageList'
import InputArea from './InputArea'
import StartupDialog from './StartupDialog'
import { useIPCListeners } from '../hooks/useIPCListeners'
import { useChatAPI } from '../hooks/useChatAPI'

// How often to auto-save history to disk (ms)
const HISTORY_AUTOSAVE_INTERVAL = 5000

const ChatUI = ({ isDarkMode, onToggleDark, onOpenSettings, activeView }) => {

  // ── Core state ──────────────────────────────────────────────────────────────
  const [messages, setMessages]             = useState([])
  const [inputText, setInputText]           = useState('')
  const [screenshots, setScreenshots]       = useState([])
  const [isStreaming, setIsStreaming]        = useState(false)
  const [isProtected, setIsProtected]       = useState(false)
  const [isTypingMode, setIsTypingMode]     = useState(false)
  const [ghostText, setGhostText]           = useState('')
  const [geminiApiKeys, setGeminiApiKeys]   = useState(['', '', '', ''])
  const [openaiApiKeys, setOpenaiApiKeys]   = useState(['', '', '', ''])

  // ── Startup dialog state ────────────────────────────────────────────────────
  const [showStartup, setShowStartup]         = useState(false)
  const [savedHistory, setSavedHistory]       = useState(null)  // { messages, savedAt }
  const [historyLoaded, setHistoryLoaded]     = useState(false)

  // ── Refs ────────────────────────────────────────────────────────────────────
  const messagesEndRef      = useRef(null)
  const textareaRef         = useRef(null)
  const handleSendRef       = useRef(null)
  const scrollContainerRef  = useRef(null)
  const autosaveTimerRef    = useRef(null)

  // ── Load settings + history on mount ───────────────────────────────────────
  useEffect(() => {
    if (!window.api?.loadSettings) return

    Promise.all([
      window.api.loadSettings(),
      window.api.loadHistory?.() ?? Promise.resolve({ messages: [], savedAt: null })
    ]).then(([settings, history]) => {
      if (settings?.geminiApiKeys) setGeminiApiKeys(settings.geminiApiKeys)
      if (settings?.openaiApiKeys) setOpenaiApiKeys(settings.openaiApiKeys)

      if (history?.messages?.length > 0) {
        // Show startup dialog so user can choose
        setSavedHistory(history)
        setShowStartup(true)
      }
      setHistoryLoaded(true)
    })
  }, [])

  // ── Reload settings when returning to chat view ────────────────────────────
  useEffect(() => {
    if (activeView === 'chat' && window.api?.loadSettings) {
      window.api.loadSettings().then((settings) => {
        if (settings?.geminiApiKeys) setGeminiApiKeys(settings.geminiApiKeys)
        if (settings?.openaiApiKeys) setOpenaiApiKeys(settings.openaiApiKeys)
      })
    }
  }, [activeView])

  // ── Auto-save history to disk whenever messages change ─────────────────────
  useEffect(() => {
    if (!historyLoaded || messages.length === 0) return

    clearTimeout(autosaveTimerRef.current)
    autosaveTimerRef.current = setTimeout(() => {
      window.api?.saveHistory?.(messages)
    }, HISTORY_AUTOSAVE_INTERVAL)

    return () => clearTimeout(autosaveTimerRef.current)
  }, [messages, historyLoaded])

  // ── Active Gemini key ───────────────────────────────────────────────────────
  const activeApiKey = geminiApiKeys.find((k) => k && k.trim()) || ''

  // ── IPC listeners ──────────────────────────────────────────────────────────
  useIPCListeners({
    setScreenshots,
    setIsProtected,
    setIsTypingMode,
    setInputText,
    setGhostText,
    handleSendRef,
    scrollContainerRef
  })

  // ── Chat API hook ──────────────────────────────────────────────────────────
  const { handleSend } = useChatAPI({
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
  })

  // Keep handleSendRef in sync for IPC trigger-send
  useEffect(() => { handleSendRef.current = handleSend }, [handleSend])

  // Focus textarea when typing mode activates
  useEffect(() => {
    if (isTypingMode) textareaRef.current?.focus()
  }, [isTypingMode])

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Startup dialog handlers ─────────────────────────────────────────────────
  const handleContinue = useCallback(() => {
    if (savedHistory?.messages?.length > 0) {
      setMessages(savedHistory.messages)
    }
    setShowStartup(false)
    setSavedHistory(null)
  }, [savedHistory])

  const handleNewChat = useCallback(async () => {
    await window.api?.clearHistory?.()
    setMessages([])
    setShowStartup(false)
    setSavedHistory(null)
  }, [])

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen relative items-center pt-4 w-full">

      {/* Startup dialog — shown when saved history exists */}
      {showStartup && savedHistory && (
        <StartupDialog
          messageCount={savedHistory.messages.length}
          lastTimestamp={savedHistory.savedAt}
          onContinue={handleContinue}
          onNewChat={handleNewChat}
        />
      )}

      {/* Top bar */}
      <TopBar
        isDarkMode={isDarkMode}
        onToggleDark={onToggleDark}
        onOpenSettings={onOpenSettings}
        isProtected={isProtected}
        isTypingMode={isTypingMode}
        activeApiKey={activeApiKey}
      />

      {/* Main chat area */}
      <div className="w-full max-w-3xl flex-1 flex flex-col mt-[55px] mb-3 bg-white/60 dark:bg-[#1a1a1a]/60 backdrop-blur-md shadow-sm border border-gray-200/50 dark:border-gray-800/50 rounded-2xl overflow-hidden">

        <MessageList
          messages={messages}
          isStreaming={isStreaming}
          scrollContainerRef={scrollContainerRef}
          messagesEndRef={messagesEndRef}
        />

        <InputArea
          inputText={inputText}
          screenshots={screenshots}
          isStreaming={isStreaming}
          isTypingMode={isTypingMode}
          textareaRef={textareaRef}
          onInputChange={setInputText}
          onRemoveScreenshot={(idx) =>
            setScreenshots((prev) => prev.filter((_, i) => i !== idx))
          }
          onSend={handleSend}
        />
      </div>
    </div>
  )
}

export default ChatUI
