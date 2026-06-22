import { ArrowLeft, Sun, Moon, Loader2 } from 'lucide-react'
import ApiKeysSection from './ApiKeysSection'
import ShortcutsSection from './ShortcutsSection'
import { useSettings } from '../hooks/useSettings'


const Settings = ({ isDarkMode, onToggleDark, onClose }) => {
  const { storedSettings, loading, mergeSettings } = useSettings()

  return (
    <div className="flex flex-col h-screen w-full relative items-center pt-4">

      {}
      <div className="absolute top-4 z-50 flex items-center bg-white/70 dark:bg-[#1a1a1a]/70 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)] rounded-full px-2 py-1.5 border border-gray-100/50 dark:border-gray-800/50 space-x-2 w-max">

        {}
        <button
          onClick={onClose}
          className="flex items-center space-x-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-1.5 rounded-full transition-colors text-gray-700 dark:text-gray-300"
          title="Back to chat"
        >
          <ArrowLeft size={14} />
          <span className="text-sm font-semibold">Chat</span>
        </button>

        <div className="h-4 w-px bg-gray-200 dark:bg-gray-700" />

        <span className="px-3 text-sm font-bold text-gray-800 dark:text-gray-100 tracking-wide">
          Settings
        </span>

        <div className="h-4 w-px bg-gray-200 dark:bg-gray-700" />

        {}
        <button
          onClick={onToggleDark}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500 dark:text-gray-400"
          title="Toggle theme"
        >
          {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>

      {}
      <div className="w-full max-w-2xl flex-1 flex flex-col mt-[55px] mb-3 overflow-hidden">
        {loading ? (
          
          <div className="flex-1 flex items-center justify-center">
            <Loader2 size={28} className="animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-4
            [&::-webkit-scrollbar]:w-1.5
            [&::-webkit-scrollbar-track]:transparent
            [&::-webkit-scrollbar-thumb]:rounded-full
            [&::-webkit-scrollbar-thumb]:bg-gray-300
            dark:[&::-webkit-scrollbar-thumb]:bg-gray-700">

            {}
            <div className="pt-2 pb-1">
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                App Settings
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Configure your Gemini API keys and global keyboard shortcuts
              </p>
            </div>

            {}
            <ApiKeysSection
              initialKeys={storedSettings.geminiApiKeys}
              onSaved={mergeSettings}
            />

            {}
            <ShortcutsSection
              initialShortcuts={storedSettings.shortcuts}
              onSaved={mergeSettings}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default Settings
