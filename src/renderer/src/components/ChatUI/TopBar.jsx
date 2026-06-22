import { Settings, Mic, Command, Moon, Sun } from 'lucide-react'


const TopBar = ({ isDarkMode, onToggleDark, onOpenSettings, isProtected, isTypingMode, activeApiKey }) => (
  <div className="absolute top-4 z-50 flex items-center bg-white/70 dark:bg-[#1a1a1a]/70 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)] rounded-full px-2 py-1.5 border border-gray-100/50 dark:border-gray-800/50 space-x-2 w-max">

    {}
    <div className="flex items-center space-x-1.5 bg-[#FF3B30] text-white px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide">
      <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
      <span>LIVE</span>
    </div>

    {}
    <button className="flex items-center space-x-2 hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-1.5 rounded-full transition-colors text-gray-700 dark:text-gray-300">
      <span className="font-semibold text-sm">Ask AI</span>
      <div className="flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 w-5 h-5">
        <Command size={12} />
      </div>
    </button>

    {}
    <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500 dark:text-gray-400">
      <Mic size={16} />
    </button>

    {}
    <button className="flex items-center space-x-2 hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-1.5 rounded-full transition-colors text-gray-700 dark:text-gray-300">
      <span className="font-semibold text-sm">Show/Hide</span>
      <div className="flex space-x-1">
        <div className="flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 w-5 h-5">
          <Command size={12} />
        </div>
        <div className="flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 w-5 h-5 text-xs font-bold">
          M
        </div>
      </div>
    </button>

    {}
    {isProtected && (
      <div className="flex items-center space-x-1.5 bg-purple-500/80 backdrop-blur text-white px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide border border-purple-400/50">
        <span>Ghost Mode</span>
      </div>
    )}
    {isTypingMode && (
      <div className="flex items-center space-x-1.5 bg-orange-500/90 text-white px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide border border-orange-400/50">
        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
        <span>GHOST TYPING</span>
      </div>
    )}
    {!activeApiKey && (
      <div className="flex items-center space-x-1.5 bg-red-500/80 text-white px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide border border-red-400/50">
        <span>No API Key</span>
      </div>
    )}

    <div className="h-4 w-px bg-gray-200 dark:bg-gray-700 mx-1" />

    {}
    <button
      onClick={onOpenSettings}
      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500 dark:text-gray-400"
      title="Settings"
    >
      <Settings size={16} />
    </button>

    {}
    <button
      onClick={onToggleDark}
      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500 dark:text-gray-400"
      title="Toggle theme"
    >
      {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  </div>
)

export default TopBar
