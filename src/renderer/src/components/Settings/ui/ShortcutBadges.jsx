import KeyBadge from './KeyBadge'
import { parseCombo } from '../../constants/shortcuts'


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

export default ShortcutBadges
