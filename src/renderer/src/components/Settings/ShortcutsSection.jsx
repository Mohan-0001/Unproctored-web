import { useState, useEffect } from 'react'
import { Keyboard, Edit2, RotateCcw } from 'lucide-react'
import ShortcutBadges from './ui/ShortcutBadges'
import ShortcutRecorder from './ShortcutRecorder'
import SaveButton from './ui/SaveButton'
import { SHORTCUT_META, DEFAULT_SHORTCUTS } from '../constants/shortcuts'


const ShortcutsSection = ({ initialShortcuts, onSaved }) => {
  const [shortcuts, setShortcuts]   = useState({ ...DEFAULT_SHORTCUTS, ...initialShortcuts })
  const [editingId, setEditingId]   = useState(null)   
  const [saveState, setSaveState]   = useState('idle') 

  
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

      {}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100/70 dark:border-gray-800/70">
        <div className="p-2 rounded-lg bg-purple-500/10 dark:bg-purple-900/30 text-purple-500">
          <Keyboard size={16} />
        </div>
        <div>
          <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100">Global Keyboard Shortcuts</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Click Edit on any row, press your combo, then Apply</p>
        </div>
      </div>

      {}
      <div className="divide-y divide-gray-100/60 dark:divide-gray-800/60">
        {SHORTCUT_META.map(({ id, label, desc }) => (
          <div key={id} className="px-5 py-3.5">
            <div className="flex items-start justify-between gap-4">

              {}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{label}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{desc}</p>
              </div>

              {}
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

                    {}
                    <button
                      onClick={() => setEditingId(id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      title="Edit shortcut"
                    >
                      <Edit2 size={13} />
                    </button>

                    {}
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

      {}
      <div className="px-5 py-4 border-t border-gray-100/70 dark:border-gray-800/70 flex items-center justify-between gap-3">
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Changes take effect immediately after saving
        </p>
        <SaveButton state={saveState} onClick={handleSaveAll} label="Save All Shortcuts" />
      </div>
    </div>
  )
}

export default ShortcutsSection
