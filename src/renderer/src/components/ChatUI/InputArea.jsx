import { useState, useCallback } from 'react'
import { X, Send, Zap, Bot } from 'lucide-react'
import SlashMenu from './SlashMenu'
import { getSlashSuggestions, getActiveRoute, isCommandComplete } from '../utils/agentRouter'

/** Small inline icon for the current agent */
const AgentDot = ({ route }) => {
  if (!route) return null
  const Icon = route.agent === 'chatgpt' ? Bot : Zap
  return (
    <div
      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold shrink-0 transition-all duration-200"
      style={{ color: route.color, backgroundColor: route.color + '18' }}
      title={`Sending to ${route.label}`}
    >
      <Icon size={11} />
      <span>{route.shortLabel}</span>
    </div>
  )
}

/**
 * InputArea — textarea + slash-command routing drop-up.
 *
 * Props:
 *   inputText         — current textarea value
 *   screenshots       — array of base64 image strings
 *   isStreaming        — boolean
 *   isTypingMode       — boolean (ghost typing active)
 *   textareaRef        — ref forwarded from parent
 *   onInputChange      — (value: string) => void
 *   onRemoveScreenshot — (idx: number) => void
 *   onSend             — () => void
 */
const InputArea = ({
  inputText,
  screenshots,
  isStreaming,
  isTypingMode,
  textareaRef,
  onInputChange,
  onRemoveScreenshot,
  onSend
}) => {
  const [slashActive, setSlashActive]       = useState(false)
  const [slashSuggestions, setSuggestions]  = useState([])
  const [activeIndex, setActiveIndex]       = useState(0)

  // Derive active route from current text (for the live badge)
  const activeRoute = getActiveRoute(inputText)

  // ── Input change handler ──────────────────────────────────────────────────
  const handleChange = useCallback(
    (e) => {
      const val = e.target.value
      onInputChange(val)

      // Dismiss menu immediately if the user has fully typed a complete command + space
      if (isCommandComplete(val)) {
        setSlashActive(false)
        setSuggestions([])
      } else {
        const suggestions = getSlashSuggestions(val)
        setSuggestions(suggestions)
        setSlashActive(suggestions.length > 0)
        setActiveIndex(0)
      }

      // Auto-resize
      e.target.style.height = 'auto'
      e.target.style.height = e.target.scrollHeight + 'px'
    },
    [onInputChange]
  )

  // ── Keyboard handler ──────────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e) => {
      if (slashActive) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setActiveIndex((i) => Math.min(i + 1, slashSuggestions.length - 1))
          return
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          setActiveIndex((i) => Math.max(i - 1, 0))
          return
        }
        if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey && slashSuggestions[activeIndex])) {
          e.preventDefault()
          handleSelectRoute(slashSuggestions[activeIndex])
          return
        }
        if (e.key === 'Escape') {
          e.preventDefault()
          setSlashActive(false)
          return
        }
      }

      // Normal send on Enter (no shift, no slash menu open)
      if (e.key === 'Enter' && !e.shiftKey && !slashActive) {
        e.preventDefault()
        onSend()
      }
    },
    [slashActive, slashSuggestions, activeIndex, onSend]
  )

  // ── Route selection from slash menu ──────────────────────────────────────
  const handleSelectRoute = useCallback(
    (route) => {
      // Fill the command prefix into the textarea so user can type their message
      const newVal = route.command + ' '
      onInputChange(newVal)
      setSlashActive(false)
      setSuggestions([])
      // Re-focus textarea
      setTimeout(() => textareaRef.current?.focus(), 0)
    },
    [onInputChange, textareaRef]
  )

  const canSend = !isStreaming && (inputText.trim().length > 0 || screenshots.length > 0)

  return (
    <div className="p-4 border-t border-gray-100/50 dark:border-gray-800/30 bg-white/40 dark:bg-[#1a1a1a]/40 backdrop-blur-sm">

      {/* Wrapper — relative so SlashMenu positions above */}
      <div className="relative">

        {/* ── Drop-up Slash Menu ────────────────────────────────────────────── */}
        <SlashMenu
          suggestions={slashSuggestions}
          activeIndex={activeIndex}
          onSelect={handleSelectRoute}
          visible={slashActive}
        />

        {/* ── Main input box ────────────────────────────────────────────────── */}
        <div className="bg-[#f4f4f5]/60 dark:bg-[#27272a]/60 backdrop-blur-sm rounded-2xl p-2 transition-all duration-200 border border-transparent focus-within:border-gray-300/50 dark:focus-within:border-gray-600/50">

          {/* Screenshot previews */}
          {screenshots.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-3 ml-2 mt-2">
              {screenshots.map((img, idx) => (
                <div key={idx} className="relative inline-block">
                  <img
                    src={img}
                    alt={`Preview ${idx}`}
                    className="h-20 w-auto rounded-lg border border-black/10 shadow-sm"
                  />
                  <button
                    onClick={() => onRemoveScreenshot(idx)}
                    className="absolute -top-2 -right-2 bg-gray-800 hover:bg-black text-white rounded-full p-1 shadow-md transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-end gap-1">
            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={
                isTypingMode
                  ? 'Ghost Typing Active...'
                  : 'Type / to route to an agent, or just ask...'
              }
              className="w-full bg-transparent resize-none max-h-32 outline-none text-[15px] text-gray-800 dark:text-gray-200 px-3 py-2 placeholder-gray-400 dark:placeholder-gray-500"
              rows={1}
              style={{ minHeight: '44px' }}
            />

            {/* Live agent badge */}
            <AgentDot route={activeRoute} />

            {/* Send button */}
            <button
              onClick={onSend}
              disabled={!canSend}
              className="m-1 p-2 bg-[#8ba7ff] hover:bg-[#7292f7] disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-xl transition-colors shrink-0 flex items-center justify-center disabled:cursor-not-allowed"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default InputArea
