import { useEffect, useRef } from 'react'
import { Zap, Bot } from 'lucide-react'

/** Agent icon by agent id */
const AgentIcon = ({ agent, size = 14 }) => {
  if (agent === 'chatgpt') return <Bot size={size} />
  return <Zap size={size} />
}

/**
 * SlashMenu — drop-up command palette shown above the textarea
 * when the user types "/" in the input field.
 *
 * Props:
 *   suggestions   — filtered AGENT_ROUTES array
 *   activeIndex   — currently highlighted item index
 *   onSelect      — (route) => void — called when user picks a route
 *   visible       — boolean
 */
const SlashMenu = ({ suggestions, activeIndex, onSelect, visible }) => {
  const activeRef = useRef(null)

  // Keep highlighted item scrolled into view
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  if (!visible || suggestions.length === 0) return null

  return (
    <div
      className="
        absolute bottom-full left-0 right-0 mb-2 z-50
        bg-white/80 dark:bg-[#1c1c1e]/90
        backdrop-blur-xl
        border border-gray-200/60 dark:border-gray-700/60
        rounded-2xl shadow-2xl
        overflow-hidden
        animate-slash-menu
      "
    >
      {/* Header label */}
      <div className="px-4 pt-3 pb-1.5 border-b border-gray-100/60 dark:border-gray-800/60">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
          Route to Agent
        </span>
      </div>

      {/* Route options */}
      <ul className="py-1.5">
        {suggestions.map((route, idx) => {
          const isActive = idx === activeIndex
          return (
            <li
              key={route.command}
              ref={isActive ? activeRef : null}
              onClick={() => onSelect(route)}
              className={`
                flex items-center gap-3 px-4 py-2.5 cursor-pointer
                transition-colors duration-100
                ${isActive
                  ? 'bg-gray-100/80 dark:bg-gray-800/80'
                  : 'hover:bg-gray-50/70 dark:hover:bg-gray-800/50'
                }
              `}
            >
              {/* Color-coded agent icon */}
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: route.color + '20', color: route.color }}
              >
                <AgentIcon agent={route.agent} size={15} />
              </div>

              {/* Text block */}
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    {route.label}
                  </span>
                  {/* Command chip */}
                  <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200/70 dark:border-gray-700/70">
                    {route.command}
                  </span>
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500 truncate">
                  {route.description}
                </span>
              </div>

              {/* Active indicator */}
              {isActive && (
                <div className="ml-auto shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: route.color }} />
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {/* Keyboard hint footer */}
      <div className="px-4 py-2 border-t border-gray-100/60 dark:border-gray-800/60 flex items-center gap-3">
        <kbd className="text-[10px] px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-400">↑↓</kbd>
        <span className="text-[10px] text-gray-400">navigate</span>
        <kbd className="text-[10px] px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-400">Tab</kbd>
        <span className="text-[10px] text-gray-400">select</span>
        <kbd className="text-[10px] px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-400">Esc</kbd>
        <span className="text-[10px] text-gray-400">dismiss</span>
      </div>
    </div>
  )
}

export default SlashMenu
