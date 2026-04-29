import { useState, useEffect, useRef } from 'react'
import { Settings, Mic, Send, X, Layers, Moon, Sun, Command } from 'lucide-react'
// import { ChatGroq } from '@langchain/groq'
import { ChatGoogleGenerativeAI } from "@langchain/google-genai"
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Check, Copy as CopyIcon } from 'lucide-react'

const ChatUI = () => {
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [screenshots, setScreenshots] = useState([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [apiKey, setApiKey] = useState(localStorage.getItem('groq_api_key') || '')
  const [showSettings, setShowSettings] = useState(false)
  const [isProtected, setIsProtected] = useState(false)

  // Ghost Typing Mode states
  const [isTypingMode, setIsTypingMode] = useState(false)
  const [ghostText, setGhostText] = useState('')

  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)
  const handleSendRef = useRef(null)
  const scrollContainerRef = useRef(null)

  const handleSend = async () => {
    if (!inputText.trim() && screenshots.length === 0) return
    if (!apiKey) {
      alert('Please set your Groq API Key in settings first.')
      setShowSettings(true)
      return
    }

    const newUserMsg = {
      role: 'user',
      text: inputText,
      images: screenshots
    }

    setMessages((prev) => [...prev, newUserMsg])
    setInputText('')
    setGhostText('')
    setScreenshots([])
    setIsStreaming(true)

    // Reset global typing buffer
    if (window.api && window.api.resetTypingBuffer) {
      window.api.resetTypingBuffer();
    }

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = '44px';
    }

    // Add empty AI message to stream into
    setMessages((prev) => [...prev, { role: 'ai', text: '' }])

    try {
      const chat = new ChatGoogleGenerativeAI({
        model: "gemini-2.5-flash-lite",
        temperature: 0,
        maxRetries: 2,
        apiKey: apiKey,
        streaming: true
      })

      // Format history with images for vision support
      const history = messages.map((m) => {
        if (m.role === 'user') {
          const content = [{ type: 'text', text: m.text || 'Look at these images.' }]
          if (m.images && m.images.length > 0) {
            m.images.forEach((img) => {
              content.push({ type: 'image_url', image_url: { url: img } })
            })
          }
          return new HumanMessage({ content })
        } else if (m.role === 'ai') {
          return new AIMessage(m.text)
        }
        return new SystemMessage(m.text)
      })

      // Prepare current message with images
      const currentContent = [{ type: 'text', text: newUserMsg.text || 'Analyze this.' }]
      if (newUserMsg.images && newUserMsg.images.length > 0) {
        newUserMsg.images.forEach((img) => {
          currentContent.push({ type: 'image_url', image_url: { url: img } })
        })
      }
      history.push(new HumanMessage({ content: currentContent }))

      const stream = await chat.stream(history)

      let accumulatedText = ''
      for await (const chunk of stream) {
        accumulatedText += chunk.content
        setMessages((prev) => {
          const newMessages = [...prev]
          newMessages[newMessages.length - 1].text = accumulatedText
          return newMessages
        })
      }
    } catch (error) {
      console.error(error)
      setMessages((prev) => {
        const newMessages = [...prev]
        newMessages[newMessages.length - 1].text = 'Error connecting to AI: ' + error.message
        return newMessages
      })
    } finally {
      setIsStreaming(false)
    }
  }

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkMode])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (window.api && window.api.onScreenshotCaptured) {
      window.api.onScreenshotCaptured((imgDataUrl) => {
        setScreenshots((prev) => [...prev, imgDataUrl])
      })
    }
  }, [])

  useEffect(() => {
    if (window.api && window.api.onProtectionToggled) {
      window.api.onProtectionToggled((value) => {
        setIsProtected(value)
      })
    }
  }, [])

  // Keep handleSendRef updated
  useEffect(() => {
    handleSendRef.current = handleSend
  }, [handleSend])

  // Ghost Typing Mode Listener
  useEffect(() => {
    if (!window.api) return;

    window.api.onTypingModeToggled((isToggled) => {
      setIsTypingMode(isToggled);
      if (isToggled) {
        setGhostText('');
      }
    });

    window.api.onUpdateText((text) => {
      setInputText(text);
      setGhostText(text);
    });

    window.api.onTriggerSend(() => {
      if (handleSendRef.current) handleSendRef.current();
    });

    window.api.onScrollUI((amount) => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollBy({
          top: amount,
          behavior: 'smooth'
        });
      }
    });
  }, []);

  // Auto-focus textarea when Ghost Typing is active
  useEffect(() => {
    if (isTypingMode && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isTypingMode]);


  const handleSaveSettings = (e) => {
    e.preventDefault()
    localStorage.setItem('groq_api_key', apiKey)
    setShowSettings(false)
  }

  // Custom CodeBlock component for Markdown
  const CodeBlock = ({ language, value }) => {
    const [copied, setCopied] = useState(false)

    const handleCopy = () => {
      navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }

    return (
      <div className="relative group my-4 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-[#1e1e1e] border-b border-gray-200 dark:border-gray-800">
          <span className="text-xs font-mono text-gray-500 dark:text-gray-400 uppercase">{language || 'code'}</span>
          <button
            onClick={handleCopy}
            className="flex items-center space-x-1.5 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
          >
            {copied ? <Check size={14} /> : <CopyIcon size={14} />}
            <span className="text-xs font-medium">{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>
        <SyntaxHighlighter
          language={language || 'text'}
          style={vscDarkPlus}
          customStyle={{
            margin: 0,
            padding: '1rem',
            fontSize: '0.9rem',
            lineHeight: '1.5',
            background: 'transparent',
          }}
        >
          {value}
        </SyntaxHighlighter>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen relative items-center pt-4 w-full">
      {/* Floating Top Bar (Interview Coder / Cluely style) */}
      <div className="absolute top-4 z-50 flex items-center bg-white/70 dark:bg-[#1a1a1a]/70 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)] rounded-full px-2 py-1.5 border border-gray-100/50 dark:border-gray-800/50 space-x-2 w-max">
        {/* Recording / Time indicator */}
        <div className="flex items-center space-x-1.5 bg-[#FF3B30] text-white px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          <span>13:32</span>
        </div>

        <button className="flex items-center space-x-2 hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-1.5 rounded-full transition-colors text-gray-700 dark:text-gray-300">
          <span className="font-semibold text-sm">Ask AI</span>
          <div className="flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 w-5 h-5">
            <Command size={12} />
          </div>
        </button>

        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500 dark:text-gray-400">
          <Mic size={16} />
        </button>

        <button className="flex items-center space-x-2 hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-1.5 rounded-full transition-colors text-gray-700 dark:text-gray-300">
          <span className="font-semibold text-sm">Show/Hide</span>
          <div className="flex space-x-1">
            <div className="flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 w-5 h-5">
              <Command size={12} />
            </div>
            <div className="flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 w-5 h-5 text-xs font-bold">
              \
            </div>
          </div>
        </button>

        {isProtected && (
          <div className="flex items-center space-x-1.5 bg-purple-500/80 backdrop-blur text-white px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide border border-purple-400/50">
            <span>Ghost Mode</span>
          </div>
        )}

        {isTypingMode && (
          <div className="flex items-center space-x-1.5 bg-orange-500/90 text-white px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide border border-orange-400/50">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span>GHOST TYPING ACTIVE</span>
          </div>
        )}

        <div className="h-4 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>

        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500 dark:text-gray-400"
        >
          <Settings size={16} />
        </button>
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500 dark:text-gray-400"
        >
          {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="absolute top-20 z-50 bg-white/80 dark:bg-[#1a1a1a]/80 backdrop-blur-lg p-4 rounded-xl shadow-xl border border-gray-200/50 dark:border-gray-800/50 w-80">
          <h3 className="text-sm font-bold mb-3 dark:text-white">Settings</h3>
          <form onSubmit={handleSaveSettings}>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Groq API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full bg-gray-50 dark:bg-[#222] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                placeholder="gsk_..."
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-lg py-2 text-sm font-semibold transition-colors"
            >
              Save
            </button>
          </form>
        </div>
      )}

      {/* Main Chat Container */}
      <div className="w-full max-w-3xl flex-1 flex flex-col mt-[72px] mb-8 bg-white/60 dark:bg-[#1a1a1a]/60 backdrop-blur-md shadow-sm dark:shadow-none border border-gray-200/50 dark:border-gray-800/50 rounded-2xl overflow-hidden">
        {/* Chat History */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-6 space-y-8">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
              <Layers size={48} className="mb-4 opacity-50" />
              <p className="font-medium">Ctrl+S to attach screenshot</p>
              <p className="text-sm mt-2">Start typing to ask AI</p>
            </div>
          )}

          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              {msg.role === 'user' ? (
                <div className="max-w-[80%] bg-[#F2F2F7]/80 dark:bg-[#2C2C2E]/80 backdrop-blur-sm text-black dark:text-white px-5 py-3 rounded-2xl rounded-tr-sm">
                  {msg.images && msg.images.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {msg.images.map((img, i) => (
                        <img
                          key={i}
                          src={img}
                          alt={`Screenshot ${i + 1}`}
                          className="max-w-[calc(50%-4px)] h-auto rounded-lg border border-black/10 dark:border-white/10"
                        />
                      ))}
                    </div>
                  )}
                  {msg.text && (
                    <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  )}
                </div>
              ) : (
                <div className="max-w-[95%] w-full">
                  <div className="flex items-center space-x-2 mb-3 text-gray-700 dark:text-gray-300">
                    <div className="flex items-center justify-center bg-gray-100 dark:bg-gray-800 p-1.5 rounded-md">
                      <Layers size={14} className="text-gray-600 dark:text-gray-400" />
                    </div>
                    <span className="font-semibold text-[15px]">AI Response</span>
                  </div>
                  <div className="pl-8 text-[15px] leading-relaxed text-gray-600 dark:text-gray-300">
                    {msg.text ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code({ node, inline, className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || '')
                            return !inline && match ? (
                              <CodeBlock
                                language={match[1]}
                                value={String(children).replace(/\n$/, '')}
                                {...props}
                              />
                            ) : (
                              <code className={`${className} bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono`} {...props}>
                                {children}
                              </code>
                            )
                          },
                          p: ({ children }) => <p className="mb-4 last:mb-0 leading-relaxed">{children}</p>,
                          ul: ({ children }) => <ul className="list-disc pl-5 mb-4 space-y-2">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal pl-5 mb-4 space-y-2">{children}</ol>,
                          li: ({ children }) => <li className="text-[15px]">{children}</li>,
                          h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 mt-6 first:mt-0">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-xl font-bold mb-3 mt-5 first:mt-0">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-lg font-bold mb-2 mt-4 first:mt-0">{children}</h3>,
                          blockquote: ({ children }) => (
                            <blockquote className="border-l-4 border-gray-200 dark:border-gray-700 pl-4 italic my-4 text-gray-500">
                              {children}
                            </blockquote>
                          ),
                        }}
                      >
                        {msg.text}
                      </ReactMarkdown>
                    ) : (
                      isStreaming && index === messages.length - 1 && (
                        <div className="flex space-x-1 items-center mt-1">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-gray-100/50 dark:border-gray-800/30 bg-white/40 dark:bg-[#1a1a1a]/40 backdrop-blur-sm">
          <div className="bg-[#f4f4f5]/60 dark:bg-[#27272a]/60 backdrop-blur-sm rounded-2xl p-2 transition-all duration-200 border border-transparent focus-within:border-gray-300/50 dark:focus-within:border-gray-600/50">
            {/* Screenshot Previews */}
            {screenshots.length > 0 && (
              <div className="flex flex-wrap gap-3 mb-3 ml-2 mt-2">
                {screenshots.map((img, index) => (
                  <div key={index} className="relative inline-block">
                    <img
                      src={img}
                      alt={`Preview ${index}`}
                      className="h-20 w-auto rounded-lg border border-black/10 shadow-sm"
                    />
                    <button
                      onClick={() => setScreenshots((prev) => prev.filter((_, i) => i !== index))}
                      className="absolute -top-2 -right-2 bg-gray-800 hover:bg-black text-white rounded-full p-1 shadow-md transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-end">
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                placeholder={isTypingMode ? "Ghost Typing Active..." : "Ask AI a question..."}
                className="w-full bg-transparent resize-none max-h-32 outline-none text-[15px] text-gray-800 dark:text-gray-200 px-3 py-2 placeholder-gray-400 dark:placeholder-gray-500"
                rows={1}
                style={{ minHeight: '44px' }}
                onInput={(e) => {
                  e.target.style.height = 'auto'
                  e.target.style.height = e.target.scrollHeight + 'px'
                }}
              />
              <button
                onClick={handleSend}
                disabled={isStreaming || (!inputText.trim() && screenshots.length === 0)}
                className="m-1 p-2 bg-[#8ba7ff] hover:bg-[#7292f7] disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-xl transition-colors shrink-0 flex items-center justify-center disabled:cursor-not-allowed"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
          <div className="text-center mt-2 flex flex-col items-center gap-1">
            <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">
              Use <kbd className="px-1 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">Ctrl</kbd> + <kbd className="px-1 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">S</kbd> to attach a screenshot
            </span>
            <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">
              Press <kbd className="px-1 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">Ctrl</kbd> + <kbd className="px-1 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">T</kbd> to toggle Ghost Typing
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChatUI