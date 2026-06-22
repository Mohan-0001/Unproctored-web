import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Layers } from 'lucide-react'
import CodeBlock from './CodeBlock'


const mdComponents = {
  code({ node, inline, className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || '')
    return !inline && match ? (
      <CodeBlock language={match[1]} value={String(children).replace(/\n$/, '')} {...props} />
    ) : (
      <code
        className={`${className} bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono`}
        {...props}
      >
        {children}
      </code>
    )
  },
  p:          ({ children }) => <p className="mb-4 last:mb-0 leading-relaxed">{children}</p>,
  ul:         ({ children }) => <ul className="list-disc pl-5 mb-4 space-y-2">{children}</ul>,
  ol:         ({ children }) => <ol className="list-decimal pl-5 mb-4 space-y-2">{children}</ol>,
  li:         ({ children }) => <li className="text-[15px]">{children}</li>,
  h1:         ({ children }) => <h1 className="text-2xl font-bold mb-4 mt-6 first:mt-0">{children}</h1>,
  h2:         ({ children }) => <h2 className="text-xl font-bold mb-3 mt-5 first:mt-0">{children}</h2>,
  h3:         ({ children }) => <h3 className="text-lg font-bold mb-2 mt-4 first:mt-0">{children}</h3>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-gray-200 dark:border-gray-700 pl-4 italic my-4 text-gray-500">
      {children}
    </blockquote>
  )
}


const MessageList = ({ messages, isStreaming, scrollContainerRef, messagesEndRef }) => (
  <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-6 space-y-8">

    {}
    {messages.length === 0 && (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
        <Layers size={48} className="mb-4 opacity-50" />
        <p className="font-medium">Ctrl+S to attach screenshot</p>
        <p className="text-sm mt-2">Start typing to ask Gemini AI</p>
      </div>
    )}

    {}
    {messages.map((msg, idx) => (
      <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>

        {}
        {msg.role === 'user' ? (
          <div className="max-w-[80%] bg-[#F2F2F7]/80 dark:bg-[#2C2C2E]/80 backdrop-blur-sm text-black dark:text-white px-5 py-3 rounded-2xl rounded-tr-sm">
            {msg.images?.length > 0 && (
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
            {}
            <div className="flex items-center space-x-2 mb-3 text-gray-700 dark:text-gray-300">
              <div className="flex items-center justify-center bg-gray-100 dark:bg-gray-800 p-1.5 rounded-md">
                <Layers size={14} className="text-gray-600 dark:text-gray-400" />
              </div>
              <span className="font-semibold text-[15px]">Gemini</span>
            </div>

            {}
            <div className="pl-8 text-[15px] leading-relaxed text-gray-600 dark:text-gray-300">
              {msg.text ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                  {msg.text}
                </ReactMarkdown>
              ) : (
                isStreaming && idx === messages.length - 1 && (
                  <div className="flex space-x-1 items-center mt-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </div>
    ))}

    {}
    <div ref={messagesEndRef} />
  </div>
)

export default MessageList
