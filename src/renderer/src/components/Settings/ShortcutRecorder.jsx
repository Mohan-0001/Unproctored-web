import { useState, useEffect } from 'react'
import ShortcutBadges from './ui/ShortcutBadges'
import { buildCombo } from '../constants/shortcuts'


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
      {}
      <div
        className={`min-w-[160px] flex items-center justify-center px-3 py-1.5 rounded-lg border text-sm transition-all
          ${recorded
            ? 'border-blue-400/60 bg-blue-500/10 dark:bg-blue-900/20'
            : 'border-dashed border-gray-400 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 animate-pulse'
          }`}
      >
        {recorded
          ? <ShortcutBadges combo={recorded} />
          : <span className="text-xs text-gray-400">Press key combo…</span>
        }
      </div>

      {}
      <button
        onClick={() => { if (recorded) { setListening(false); onConfirm(recorded) } }}
        disabled={!recorded}
        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
      >
        Apply
      </button>

      {}
      <button
        onClick={onCancel}
        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
      >
        Cancel
      </button>
    </div>
  )
}

export default ShortcutRecorder
