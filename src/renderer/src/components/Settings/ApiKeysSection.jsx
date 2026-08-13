import { useState, useEffect } from 'react'
import { Edit2, Eye, EyeOff, X, Bot, Zap } from 'lucide-react'
import SaveButton from './ui/SaveButton'
import { DEFAULT_SHORTCUTS } from '../constants/shortcuts'

// ── Reusable masked display ───────────────────────────────────────────────────
const maskedKey = (k) => (k ? '•'.repeat(Math.min(k.length, 32)) : '')

/**
 * Single API key card showing a pool of keys.
 *
 * Props:
 *   title        — section title
 *   subtitle     — description text
 *   Icon         — lucide icon component
 *   iconBgClass  — tailwind class for icon background
 *   iconColorClass — tailwind class for icon color
 *   keys         — string[]
 *   labels       — string[] for slot labels
 *   placeholders — string[] for input placeholders
 *   onSave       — async (newKeys) => void
 */
const ApiKeyCard = ({
  title,
  subtitle,
  Icon,
  iconBgClass,
  iconColorClass,
  keys = ['', '', '', ''],
  labels = ['Key 1', 'Key 2', 'Key 3', 'Key 4'],
  placeholders = ['Enter API key...', 'Enter API key...', 'Enter API key...', 'Enter API key...'],
  onSave
}) => {
  const [localKeys, setLocalKeys] = useState([...keys])
  const [visible, setVisible]     = useState(keys.map(() => false))
  const [editMode, setEditMode]   = useState(false)
  const [saveState, setSaveState] = useState('idle')

  useEffect(() => {
    // Pad keys to match labels length (4)
    const padded = [...keys, '', '', '', ''].slice(0, labels.length)
    setLocalKeys(padded)
    setVisible(padded.map(() => false))
  }, [keys, labels.length])

  const toggleVisible = (i) =>
    setVisible((v) => { const n = [...v]; n[i] = !n[i]; return n })

  const setKey = (i, val) =>
    setLocalKeys((k) => { const n = [...k]; n[i] = val; return n })

  const triggerSave = async () => {
    setSaveState('saving')
    try {
      await onSave(localKeys)
      setSaveState('saved')
      setEditMode(false)
      setTimeout(() => setSaveState('idle'), 2500)
    } catch {
      setSaveState('error')
      setTimeout(() => setSaveState('idle'), 3000)
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200/60 dark:border-gray-700/60 bg-white/50 dark:bg-[#1a1a1a]/50 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100/70 dark:border-gray-800/70">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${iconBgClass} ${iconColorClass}`}>
            <Icon size={16} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100">{title}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
          </div>
        </div>

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
            onClick={() => {
              setEditMode(false)
              setLocalKeys([...keys, '', '', '', ''].slice(0, labels.length))
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X size={12} />
            Cancel
          </button>
        )}
      </div>

      {/* Key slots */}
      <div className="px-5 py-4 space-y-3">
        {labels.map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 w-14 shrink-0">
              {label}
            </span>

            {editMode ? (
              <div className="flex-1 relative">
                <input
                  type={visible[i] ? 'text' : 'password'}
                  value={localKeys[i] ?? ''}
                  onChange={(e) => setKey(i, e.target.value)}
                  placeholder={placeholders[i] || 'Enter API key...'}
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
                  {localKeys[i]
                    ? maskedKey(localKeys[i])
                    : <span className="text-gray-300 dark:text-gray-600 italic text-xs">Not set</span>
                  }
                </span>
                {localKeys[i] && (
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

      {/* Save button */}
      {editMode && (
        <div className="px-5 pb-5">
          <SaveButton state={saveState} onClick={triggerSave} label={`Save ${title}`} />
        </div>
      )}
    </div>
  )
}

/**
 * ApiKeysSection — renders both the Gemini and OpenAI key cards.
 *
 * Props:
 *   initialGeminiKeys — string[]
 *   initialOpenaiKeys — string[]
 *   onSaved           — ({ geminiApiKeys, openaiApiKeys }) => void
 */
const ApiKeysSection = ({ initialGeminiKeys, initialOpenaiKeys, onSaved }) => {
  const saveGeminiKeys = async (newKeys) => {
    const settings = await window.api.loadSettings()
    const result = await window.api.saveSettings({
      ...settings,
      geminiApiKeys: newKeys,
      shortcuts: settings?.shortcuts || DEFAULT_SHORTCUTS
    })
    if (!result?.success) throw new Error('Save failed')
    onSaved({ geminiApiKeys: newKeys })
  }

  const saveOpenaiKeys = async (newKeys) => {
    const settings = await window.api.loadSettings()
    const result = await window.api.saveSettings({
      ...settings,
      openaiApiKeys: newKeys,
      shortcuts: settings?.shortcuts || DEFAULT_SHORTCUTS
    })
    if (!result?.success) throw new Error('Save failed')
    onSaved({ openaiApiKeys: newKeys })
  }

  return (
    <div className="space-y-4">
      {/* Gemini key card */}
      <ApiKeyCard
        title="Gemini API Keys"
        subtitle="Configure up to 4 keys — first valid active key is used (rotates on 429 errors)"
        Icon={Zap}
        iconBgClass="bg-blue-500/10 dark:bg-blue-900/30"
        iconColorClass="text-blue-500"
        keys={initialGeminiKeys}
        labels={['Key 1', 'Key 2', 'Key 3', 'Key 4']}
        placeholders={[
          'AIza… (primary)',
          'AIza… (fallback 1)',
          'AIza… (fallback 2)',
          'AIza… (fallback 3)'
        ]}
        onSave={saveGeminiKeys}
      />

      {/* OpenAI key card */}
      <ApiKeyCard
        title="OpenAI API Keys"
        subtitle="Configure up to 4 keys — used for /chatgpt routing (rotates on 429 errors)"
        Icon={Bot}
        iconBgClass="bg-emerald-500/10 dark:bg-emerald-900/30"
        iconColorClass="text-emerald-500"
        keys={initialOpenaiKeys}
        labels={['Key 1', 'Key 2', 'Key 3', 'Key 4']}
        placeholders={[
          'sk-… (primary)',
          'sk-… (fallback 1)',
          'sk-… (fallback 2)',
          'sk-… (fallback 3)'
        ]}
        onSave={saveOpenaiKeys}
      />
    </div>
  )
}

export default ApiKeysSection
