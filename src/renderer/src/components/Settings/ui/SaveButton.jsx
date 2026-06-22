import { Save, Loader2, Check, AlertCircle } from 'lucide-react'


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

export default SaveButton
