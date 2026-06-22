export const SHORTCUT_META = [
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

export const DEFAULT_SHORTCUTS = {
  moveUp:           'CommandOrControl+Up',
  moveDown:         'CommandOrControl+Down',
  moveLeft:         'CommandOrControl+Left',
  moveRight:        'CommandOrControl+Right',
  toggleVisibility: 'CommandOrControl+M',
  ghostMode:        'CommandOrControl+H',
  captureScreen:    'CommandOrControl+S',
  ghostTyping:      'CommandOrControl+T',
  sendMessage:      'CommandOrControl+Enter',
  scrollUp:         'Shift+Up',
  scrollDown:       'Shift+Down',
  quitApp:          'CommandOrControl+Q'
}

export function parseCombo(combo) {
  if (!combo) return []
  return combo.split('+').map((p) => (p === 'CommandOrControl' ? 'Ctrl' : p))
}

export function buildCombo(e) {
  const parts = []
  if (e.ctrlKey || e.metaKey) parts.push('CommandOrControl')
  if (e.shiftKey) parts.push('Shift')
  if (e.altKey) parts.push('Alt')

  const k = e.key
  const skipKeys = ['Control', 'Shift', 'Alt', 'Meta']
  if (!skipKeys.includes(k)) {
    const normalised =
      k === 'ArrowUp'    ? 'Up'    :
      k === 'ArrowDown'  ? 'Down'  :
      k === 'ArrowLeft'  ? 'Left'  :
      k === 'ArrowRight' ? 'Right' :
      k.length === 1     ? k.toUpperCase() : k
    parts.push(normalised)
  }

  return parts.length > 1 || (parts.length === 1 && !skipKeys.includes(parts[0]))
    ? parts.join('+')
    : ''
}
