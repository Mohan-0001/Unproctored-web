import { useState, useEffect } from 'react'
import { Key, Edit2, Eye, EyeOff, X } from 'lucide-react'
import SaveButton from './ui/SaveButton'
import { DEFAULT_SHORTCUTS } from '../constants/shortcuts'


const ApiKeysSection = ({ initialKeys, onSaved }) => {
  const [keys, setKeys]         = useState(initialKeys.length ? [...initialKeys] : ['', ''])
  const [visible, setVisible]   = useState([false, false])
  const [editMode, setEditMode] = useState(false)
  const [saveState, setSaveState] = useState('idle') 

  
  useEffect(() => {
    setKeys(initialKeys.length ? [...initialKeys] : ['', ''])
  }, [initialKeys])

  const toggleVisible = (i) =>
    setVisible((v) => { const n = [...v]; n[i] = !n[i]; return n })

  const setKey = (i, val) =>
    setKeys((k) => { const n = [...k]; n[i] = val; return n })

  
  const triggerSave = async () => {
    setSaveState('saving')
    try {
      const settings = await window.api.loadSettings()
      const result = await window.api.saveSettings({
        geminiApiKeys: keys,
        shortcuts: settings?.shortcuts || DEFAULT_SHORTCUTS
      })
      if (result?.success) {
        setSaveState('saved')
        setEditMode(false)
        onSaved({ geminiApiKeys: keys })
        setTimeout(() => setSaveState('idle'), 2500)
      } else {
        setSaveState('error')
        setTimeout(() => setSaveState('idle'), 3000)
      }
    } catch {
      setSaveState('error')
      setTimeout(() => setSaveState('idle'), 3000)
    }
  }

  const maskedKey = (k) => (k ? '•'.repeat(Math.min(k.length, 32)) : '')

  return (
    <div className="rounded-2xl border border-gray-200/60 dark:border-gray-700/60 bg-white/50 dark:bg-[#1a1a1a]/50 backdrop-blur-sm overflow-hidden">

      {}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100/70 dark:border-gray-800/70">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10 dark:bg-blue-900/30 text-blue-500">
            <Key size={16} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100">Gemini API Keys</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Store up to 2 keys — first valid key is used</p>
          </div>
        </div>

        {}
        {!editMode ? (
          <button
            onClick={() => setEditMode(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          >
            <Edit2 size={12} />
            Edit
          </button>
        ) : (
          <button
            onClick={() => { setEditMode(false); setKeys(initialKeys.length ? [...initialKeys] : ['', '']) }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X size={12} />
            Cancel
          </button>
        )}
      </div>

      {}
      <div className="px-5 py-4 space-y-3">
        {[0, 1].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 w-14 shrink-0">
              Key {i + 1}
            </span>

            {editMode ? (
              
              <div className="flex-1 relative">
                <input
                  type={visible[i] ? 'text' : 'password'}
                  value={keys[i]}
                  onChange={(e) => setKey(i, e.target.value)}
                  placeholder={i === 0 ? 'AIza… (required)' : 'AIza… (optional)'}
                  className="w-full bg-gray-50 dark:bg-[#222] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white placeholder-gray-400 font-mono transition-all"
                />
                <button
                  type="button"
                  onClick={() => toggleVisible(i)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  {visible[i] ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            ) : (
              
              <div className="flex-1 flex items-center gap-2">
                <span className="text-sm font-mono text-gray-500 dark:text-gray-400 tracking-widest truncate">
                  {keys[i]
                    ? maskedKey(keys[i])
                    : <span className="text-gray-300 dark:text-gray-600 italic text-xs">Not set</span>
                  }
                </span>
                {keys[i] && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Set
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {}
      {editMode && (
        <div className="px-5 pb-5">
          <SaveButton state={saveState} onClick={triggerSave} label="Save API Keys" />
        </div>
      )}
    </div>
  )
}

export default ApiKeysSection
