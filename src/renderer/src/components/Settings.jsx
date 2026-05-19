import { useState, useEffect } from 'react'
import {
  ArrowLeft, Sun, Moon, Key, Keyboard, Eye, EyeOff, Save,
  Check, Loader2, Edit2, X, RotateCcw, AlertCircle
} from 'lucide-react'

// ─── Shortcut metadata ────────────────────────────────────────────────────────
const SHORTCUT_META = [
  { id: 'sendMessage',      label: 'Send Message',           desc: 'Send current message to Gemini' },
  { id: 'captureScreen',    label: 'Capture Screenshot',     desc: 'Take screenshot and attach to message' },
  { id: 'ghostTyping',      label: 'Ghost Typing Mode',      desc: 'Toggle global keystroke capture' },
  { id: 'ghostMode',        label: 'Ghost / Screen Guard',   desc: 'Hide app during screen sharing' },
  { id: 'toggleVisibility', label: 'Show / Hide Window',     desc: 'Toggle overlay visibility' },
  { id: 'moveUp',           label: 'Move Window ↑',          desc: 'Nudge overlay up 15 px' },
  { id: 'moveDown',         label: 'Move Window ↓',          desc: 'Nudge overlay down 15 px' },
  { id: 'moveLeft',         label: 'Move Window ←',          desc: 'Nudge overlay left 15 px' },
  { id: 'moveRight',        label: 'Move Window →',          desc: 'Nudge overlay right 15 px' },
  { id: 'scrollUp',         label: 'Scroll Chat Up',         desc: 'Scroll chat area up' },
  { id: 'scrollDown',       label: 'Scroll Chat Down',       desc: 'Scroll chat area down' },
  { id: 'quitApp',          label: 'Quit App',               desc: 'Fully close the overlay' }
]

const DEFAULT_SHORTCUTS = {
  moveUp: 'CommandOrControl+Up', moveDown: 'CommandOrControl+Down',
  moveLeft: 'CommandOrControl+Left', moveRight: 'CommandOrControl+Right',
  toggleVisibility: 'CommandOrControl+M', ghostMode: 'CommandOrControl+H',
  captureScreen: 'CommandOrControl+S', ghostTyping: 'CommandOrControl+T',
  sendMessage: 'CommandOrControl+Enter', scrollUp: 'Shift+Up', scrollDown: 'Shift+Down',
  quitApp: 'CommandOrControl+Q'
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
/** Split a combo string into badge parts */
function parseCombo(combo) {
  if (!combo) return []
  return combo.split('+').map((p) => (p === 'CommandOrControl' ? 'Ctrl' : p))
}

/** Build combo string from a KeyboardEvent */
function buildCombo(e) {
  const parts = []
  if (e.ctrlKey || e.metaKey) parts.push('CommandOrControl')
  if (e.shiftKey) parts.push('Shift')
  if (e.altKey) parts.push('Alt')
  const k = e.key
  const skipKeys = ['Control', 'Shift', 'Alt', 'Meta']
  if (!skipKeys.includes(k)) {
    const normalised =
      k === 'ArrowUp' ? 'Up' : k === 'ArrowDown' ? 'Down' :
      k === 'ArrowLeft' ? 'Left' : k === 'ArrowRight' ? 'Right' :
      k.length === 1 ? k.toUpperCase() : k
    parts.push(normalised)
  }
  return parts.length > 1 || (parts.length === 1 && !skipKeys.includes(parts[0]))
    ? parts.join('+')
    : ''
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Key badge pill */
const KeyBadge = ({ label }) => (
  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 shadow-sm font-mono">
    {label}
  </span>
)

/** Shortcut display as a row of badges */
const ShortcutBadges = ({ combo }) => {
  const parts = parseCombo(combo)
  if (!parts.length) return <span className="text-gray-400 text-xs">—</span>
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {parts.map((p, i) => (
        <span key={i} className="flex items-center gap-1">
          <KeyBadge label={p} />
          {i < parts.length - 1 && <span className="text-gray-400 text-xs">+</span>}
        </span>
      ))}
    </div>
  )
}

/** Save / Loader / Tick status button */
const SaveButton = ({ state, onClick, label = 'Save Changes', size = 'md' }) => {
  const base = size === 'sm'
    ? 'px-3 py-1.5 text-xs rounded-lg'
    : 'px-5 py-2.5 text-sm rounded-xl'

  if (state === 'saving') {
    return (
      <button disabled className={`${base} flex items-center gap-2 bg-blue-500/60 text-white cursor-not-allowed transition-all`}>
        <Loader2 size={14} className="animate-spin" />
        <span>Saving…</span>
      </button>
    )
  }
  if (state === 'saved') {
    return (
      <button disabled className={`${base} flex items-center gap-2 bg-emerald-500 text-white cursor-default transition-all`}>
        <Check size={14} />
        <span>Saved!</span>
      </button>
    )
  }
  if (state === 'error') {
    return (
      <button onClick={onClick} className={`${base} flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white transition-all`}>
        <AlertCircle size={14} />
        <span>Retry</span>
      </button>
    )
  }
  return (
    <button onClick={onClick} className={`${base} flex items-center gap-2 bg-[#8ba7ff] hover:bg-[#7292f7] active:scale-95 text-white font-semibold transition-all`}>
      <Save size={14} />
      <span>{label}</span>
    </button>
  )
}

// ─── Shortcut Recorder ────────────────────────────────────────────────────────
const ShortcutRecorder = ({ initial, onConfirm, onCancel }) => {
  const [recorded, setRecorded] = useState('')
  const [listening, setListening] = useState(true)

  useEffect(() => {
    if (!listening) return
    const handler = (e) => {
      e.preventDefault()
      e.stopPropagation()
      const combo = buildCombo(e)
      if (combo) setRecorded(combo)
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [listening])

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className={`min-w-[160px] flex items-center justify-center px-3 py-1.5 rounded-lg border text-sm transition-all
        ${recorded
          ? 'border-blue-400/60 bg-blue-500/10 dark:bg-blue-900/20'
          : 'border-dashed border-gray-400 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 animate-pulse'}`}>
        {recorded
          ? <ShortcutBadges combo={recorded} />
          : <span className="text-xs text-gray-400">Press key combo…</span>}
      </div>
      <button
        onClick={() => { if (recorded) { setListening(false); onConfirm(recorded) } }}
        disabled={!recorded}
        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
      >
        Apply
      </button>
      <button
        onClick={onCancel}
        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
      >
        Cancel
      </button>
    </div>
  )
}

// ─── API Keys Section ─────────────────────────────────────────────────────────
const ApiKeysSection = ({ initialKeys, onSaved }) => {
  const [keys, setKeys] = useState(initialKeys.length ? [...initialKeys] : ['', ''])
  const [visible, setVisible] = useState([false, false])
  const [editMode, setEditMode] = useState(false)
  const [saveState, setSaveState] = useState('idle') // idle|saving|saved|error

  // Sync if parent updates
  useEffect(() => { setKeys(initialKeys.length ? [...initialKeys] : ['', '']) }, [initialKeys])

  const toggleVisible = (i) =>
    setVisible((v) => { const n = [...v]; n[i] = !n[i]; return n })

  const setKey = (i, val) =>
    setKeys((k) => { const n = [...k]; n[i] = val; return n })

  const handleSave = async (shortcuts) => {
    setSaveState('saving')
    try {
      const result = await window.api.saveSettings({ geminiApiKeys: keys, shortcuts })
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

  const triggerSave = async () => {
    const settings = await window.api.loadSettings()
    handleSave(settings?.shortcuts || DEFAULT_SHORTCUTS)
  }

  const maskedKey = (k) => (k ? '•'.repeat(Math.min(k.length, 32)) : '')

  return (
    <div className="rounded-2xl border border-gray-200/60 dark:border-gray-700/60 bg-white/50 dark:bg-[#1a1a1a]/50 backdrop-blur-sm overflow-hidden">
      {/* Header */}
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

      {/* Key inputs */}
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
                  {keys[i] ? maskedKey(keys[i]) : <span className="text-gray-300 dark:text-gray-600 italic text-xs">Not set</span>}
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

      {/* Save row */}
      {editMode && (
        <div className="px-5 pb-5">
          <SaveButton state={saveState} onClick={triggerSave} label="Save API Keys" />
        </div>
      )}
    </div>
  )
}

// ─── Shortcuts Section ────────────────────────────────────────────────────────
const ShortcutsSection = ({ initialShortcuts, onSaved }) => {
  const [shortcuts, setShortcuts] = useState({ ...DEFAULT_SHORTCUTS, ...initialShortcuts })
  const [editingId, setEditingId] = useState(null)   // which row is in recorder mode
  const [saveState, setSaveState] = useState('idle')

  useEffect(() => {
    setShortcuts({ ...DEFAULT_SHORTCUTS, ...initialShortcuts })
  }, [initialShortcuts])

  const applyRecorded = (id, combo) => {
    setShortcuts((prev) => ({ ...prev, [id]: combo }))
    setEditingId(null)
  }

  const resetToDefault = (id) => {
    setShortcuts((prev) => ({ ...prev, [id]: DEFAULT_SHORTCUTS[id] }))
    setEditingId(null)
  }

  const handleSaveAll = async () => {
    setSaveState('saving')
    try {
      const settings = await window.api.loadSettings()
      const result = await window.api.saveSettings({
        geminiApiKeys: settings?.geminiApiKeys || ['', ''],
        shortcuts
      })
      if (result?.success) {
        setSaveState('saved')
        onSaved({ shortcuts })
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

  return (
    <div className="rounded-2xl border border-gray-200/60 dark:border-gray-700/60 bg-white/50 dark:bg-[#1a1a1a]/50 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100/70 dark:border-gray-800/70">
        <div className="p-2 rounded-lg bg-purple-500/10 dark:bg-purple-900/30 text-purple-500">
          <Keyboard size={16} />
        </div>
        <div>
          <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100">Global Keyboard Shortcuts</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Click Edit on any row, press your combo, then Apply</p>
        </div>
      </div>

      {/* Shortcut rows */}
      <div className="divide-y divide-gray-100/60 dark:divide-gray-800/60">
        {SHORTCUT_META.map(({ id, label, desc }) => (
          <div key={id} className="px-5 py-3.5">
            <div className="flex items-start justify-between gap-4">
              {/* Label + desc */}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{label}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{desc}</p>
              </div>

              {/* Right side: badge or recorder */}
              <div className="shrink-0 flex items-center gap-2 pt-0.5">
                {editingId === id ? (
                  <ShortcutRecorder
                    initial={shortcuts[id]}
                    onConfirm={(combo) => applyRecorded(id, combo)}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <>
                    <ShortcutBadges combo={shortcuts[id]} />
                    <button
                      onClick={() => setEditingId(id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      title="Edit shortcut"
                    >
                      <Edit2 size={13} />
                    </button>
                    {shortcuts[id] !== DEFAULT_SHORTCUTS[id] && (
                      <button
                        onClick={() => resetToDefault(id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                        title="Reset to default"
                      >
                        <RotateCcw size={13} />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Save footer */}
      <div className="px-5 py-4 border-t border-gray-100/70 dark:border-gray-800/70 flex items-center justify-between gap-3">
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Changes take effect immediately after saving
        </p>
        <SaveButton state={saveState} onClick={handleSaveAll} label="Save All Shortcuts" />
      </div>
    </div>
  )
}

// ─── Main Settings page ───────────────────────────────────────────────────────
/**
 * @param {{ isDarkMode: boolean, onToggleDark: () => void, onClose: () => void }} props
 */
const Settings = ({ isDarkMode, onToggleDark, onClose }) => {
  const [loading, setLoading] = useState(true)
  const [storedSettings, setStoredSettings] = useState({
    geminiApiKeys: ['', ''],
    shortcuts: { ...DEFAULT_SHORTCUTS }
  })

  // Load settings from store on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        if (window.api?.loadSettings) {
          const s = await window.api.loadSettings()
          if (s) setStoredSettings(s)
        }
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [])

  const handleApiSaved = (partial) =>
    setStoredSettings((prev) => ({ ...prev, ...partial }))

  const handleShortcutsSaved = (partial) =>
    setStoredSettings((prev) => ({ ...prev, ...partial }))

  return (
    <div className="flex flex-col h-screen w-full relative items-center pt-4">

      {/* ── Top bar (same glassmorphism style as ChatUI) ── */}
      <div className="absolute top-4 z-50 flex items-center bg-white/70 dark:bg-[#1a1a1a]/70 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)] rounded-full px-2 py-1.5 border border-gray-100/50 dark:border-gray-800/50 space-x-2 w-max">

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

        <button
          onClick={onToggleDark}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500 dark:text-gray-400"
          title="Toggle theme"
        >
          {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>

      {/* ── Scrollable content ── */}
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

            {/* Page title */}
            <div className="pt-2 pb-1">
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                App Settings
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Configure your Gemini API keys and global keyboard shortcuts
              </p>
            </div>

            {/* API Keys card */}
            <ApiKeysSection
              initialKeys={storedSettings.geminiApiKeys}
              onSaved={handleApiSaved}
            />

            {/* Shortcuts card */}
            <ShortcutsSection
              initialShortcuts={storedSettings.shortcuts}
              onSaved={handleShortcutsSaved}
            />

          </div>
        )}
      </div>
    </div>
  )
}

export default Settings
