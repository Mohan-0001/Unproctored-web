import { useState, useEffect, useRef } from 'react'
import TopBar from './TopBar'
import MessageList from './MessageList'
import InputArea from './InputArea'
import { useIPCListeners } from '../hooks/useIPCListeners'
import { useChatAPI } from '../hooks/useChatAPI'


const ChatUI = ({ isDarkMode, onToggleDark, onOpenSettings }) => {
  
  const [messages, setMessages]       = useState([])
  const [inputText, setInputText]     = useState('')
  const [screenshots, setScreenshots] = useState([])
  const [isStreaming, setIsStreaming]  = useState(false)
  const [isProtected, setIsProtected] = useState(false)
  const [isTypingMode, setIsTypingMode] = useState(false)
  const [ghostText, setGhostText]     = useState('')
  const [geminiApiKeys, setGeminiApiKeys] = useState(['', ''])

  
  const messagesEndRef      = useRef(null)
  const textareaRef         = useRef(null)
  const handleSendRef       = useRef(null)
  const scrollContainerRef  = useRef(null)

  
  useEffect(() => {
    if (window.api?.loadSettings) {
      window.api.loadSettings().then((settings) => {
        if (settings?.geminiApiKeys) setGeminiApiKeys(settings.geminiApiKeys)
      })
    }
  }, [])

  
  const activeApiKey = geminiApiKeys.find((k) => k && k.trim()) || ''

  
  useIPCListeners({
    setScreenshots,
    setIsProtected,
    setIsTypingMode,
    setInputText,
    setGhostText,
    handleSendRef,
    scrollContainerRef
  })

  
  const { handleSend } = useChatAPI({
    apiKeys: geminiApiKeys,
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

  
  useEffect(() => { handleSendRef.current = handleSend }, [handleSend])

  
  useEffect(() => {
    if (isTypingMode) textareaRef.current?.focus()
  }, [isTypingMode])

  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  
  return (
    <div className="flex flex-col h-screen relative items-center pt-4 w-full">

      {}
      <TopBar
        isDarkMode={isDarkMode}
        onToggleDark={onToggleDark}
        onOpenSettings={onOpenSettings}
        isProtected={isProtected}
        isTypingMode={isTypingMode}
        activeApiKey={activeApiKey}
      />

      {}
      <div className="w-full max-w-3xl flex-1 flex flex-col mt-[55px] mb-3 bg-white/60 dark:bg-[#1a1a1a]/60 backdrop-blur-md shadow-sm border border-gray-200/50 dark:border-gray-800/50 rounded-2xl overflow-hidden">

        {}
        <MessageList
          messages={messages}
          isStreaming={isStreaming}
          scrollContainerRef={scrollContainerRef}
          messagesEndRef={messagesEndRef}
        />

        {}
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
