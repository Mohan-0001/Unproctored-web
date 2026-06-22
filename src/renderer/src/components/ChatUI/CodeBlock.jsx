import { useState } from 'react'
import { Check, Copy as CopyIcon } from 'lucide-react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'


const CodeBlock = ({ language, value }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative group my-4 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm max-w-full">
      {}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-[#1e1e1e] border-b border-gray-200 dark:border-gray-800">
        <span className="text-xs font-mono text-gray-500 dark:text-gray-400 uppercase">
          {language || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center space-x-1.5 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
        >
          {copied ? <Check size={14} /> : <CopyIcon size={14} />}
          <span className="text-xs font-medium">{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>

      {}
      <SyntaxHighlighter
        language={language || 'text'}
        style={vscDarkPlus}
        wrapLines={true}
        lineProps={{ style: { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' } }}
        customStyle={{
          margin: 0,
          padding: '1rem',
          fontSize: '0.9rem',
          lineHeight: '1.5',
          background: 'transparent',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word'
        }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  )
}

export default CodeBlock
