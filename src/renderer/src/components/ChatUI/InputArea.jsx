import { X, Send } from 'lucide-react'


const InputArea = ({
  inputText,
  screenshots,
  isStreaming,
  isTypingMode,
  textareaRef,
  onInputChange,
  onRemoveScreenshot,
  onSend
}) => (
  <div className="p-4 border-t border-gray-100/50 dark:border-gray-800/30 bg-white/40 dark:bg-[#1a1a1a]/40 backdrop-blur-sm">
    <div className="bg-[#f4f4f5]/60 dark:bg-[#27272a]/60 backdrop-blur-sm rounded-2xl p-2 transition-all duration-200 border border-transparent focus-within:border-gray-300/50 dark:focus-within:border-gray-600/50">

      {}
      {screenshots.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-3 ml-2 mt-2">
          {screenshots.map((img, idx) => (
            <div key={idx} className="relative inline-block">
              <img
                src={img}
                alt={`Preview ${idx}`}
                className="h-20 w-auto rounded-lg border border-black/10 shadow-sm"
              />
              <button
                onClick={() => onRemoveScreenshot(idx)}
                className="absolute -top-2 -right-2 bg-gray-800 hover:bg-black text-white rounded-full p-1 shadow-md transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end">
        {}
        <textarea
          ref={textareaRef}
          value={inputText}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              onSend()
            }
          }}
          onInput={(e) => {
            e.target.style.height = 'auto'
            e.target.style.height = e.target.scrollHeight + 'px'
          }}
          placeholder={isTypingMode ? 'Ghost Typing Active...' : 'Ask Gemini a question...'}
          className="w-full bg-transparent resize-none max-h-32 outline-none text-[15px] text-gray-800 dark:text-gray-200 px-3 py-2 placeholder-gray-400 dark:placeholder-gray-500"
          rows={1}
          style={{ minHeight: '44px' }}
        />

        {}
        <button
          onClick={onSend}
          disabled={isStreaming || (!inputText.trim() && screenshots.length === 0)}
          className="m-1 p-2 bg-[#8ba7ff] hover:bg-[#7292f7] disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-xl transition-colors shrink-0 flex items-center justify-center disabled:cursor-not-allowed"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  </div>
)

export default InputArea
