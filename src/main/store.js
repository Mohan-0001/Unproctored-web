import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs'

export const DEFAULT_SHORTCUTS = {
  moveUp: 'CommandOrControl+Up',
  moveDown: 'CommandOrControl+Down',
  moveLeft: 'CommandOrControl+Left',
  moveRight: 'CommandOrControl+Right',
  toggleVisibility: 'CommandOrControl+M',
  ghostMode: 'CommandOrControl+H',
  captureScreen: 'CommandOrControl+S',
  ghostTyping: 'CommandOrControl+T',
  sendMessage: 'CommandOrControl+Enter',
  scrollUp: 'Shift+Up',
  scrollDown: 'Shift+Down',
  quitApp: 'CommandOrControl+Q'
}

export const DEFAULT_SETTINGS = {
  geminiApiKeys: ['', '', '', ''],
  openaiApiKeys: ['', '', '', ''],
  shortcuts: { ...DEFAULT_SHORTCUTS }
}

function getStorePath() {
  return join(app.getPath('userData'), 'covert-settings.json')
}

function getHistoryPath() {
  return join(app.getPath('userData'), 'covert-history.json')
}

/**
 * Load settings from disk. Falls back to defaults on error.
 * @returns {{ geminiApiKeys: string[], openaiApiKeys: string[], shortcuts: Record<string,string> }}
 */
export function loadSettings() {
  try {
    const p = getStorePath()
    if (existsSync(p)) {
      const parsed = JSON.parse(readFileSync(p, 'utf-8'))
      
      let gemini = parsed.geminiApiKeys
      if (!Array.isArray(gemini)) {
        gemini = DEFAULT_SETTINGS.geminiApiKeys
      } else {
        gemini = [...gemini, '', '', '', ''].slice(0, 4)
      }

      let openai = parsed.openaiApiKeys
      if (!Array.isArray(openai)) {
        if (typeof parsed.openaiApiKey === 'string' && parsed.openaiApiKey) {
          openai = [parsed.openaiApiKey, '', '', '']
        } else {
          openai = DEFAULT_SETTINGS.openaiApiKeys
        }
      } else {
        openai = [...openai, '', '', '', ''].slice(0, 4)
      }

      return {
        geminiApiKeys: gemini,
        openaiApiKeys: openai,
        shortcuts: { ...DEFAULT_SHORTCUTS, ...(parsed.shortcuts || {}) }
      }
    }
  } catch (err) {
    console.error('[store] loadSettings error:', err)
  }
  return {
    geminiApiKeys: ['', '', '', ''],
    openaiApiKeys: ['', '', '', ''],
    shortcuts: { ...DEFAULT_SHORTCUTS }
  }
}

/**
 * Persist settings to disk.
 * @param {{ geminiApiKeys: string[], shortcuts: Record<string,string> }} settings
 * @returns {boolean} success
 */
export function saveSettings(settings) {
  try {
    writeFileSync(getStorePath(), JSON.stringify(settings, null, 2), 'utf-8')
    return true
  } catch (err) {
    console.error('[store] saveSettings error:', err)
    return false
  }
}

/**
 * Load conversation history from disk.
 * @returns {{ messages: Array, savedAt: string|null }}
 */
export function loadHistory() {
  try {
    const p = getHistoryPath()
    if (existsSync(p)) {
      const parsed = JSON.parse(readFileSync(p, 'utf-8'))
      if (Array.isArray(parsed.messages) && parsed.messages.length > 0) {
        return { messages: parsed.messages, savedAt: parsed.savedAt || null }
      }
    }
  } catch (err) {
    console.error('[store] loadHistory error:', err)
  }
  return { messages: [], savedAt: null }
}

/**
 * Persist conversation history to disk.
 * @param {Array} messages
 * @returns {boolean}
 */
export function saveHistory(messages) {
  try {
    writeFileSync(
      getHistoryPath(),
      JSON.stringify({ messages, savedAt: new Date().toISOString() }, null, 2),
      'utf-8'
    )
    return true
  } catch (err) {
    console.error('[store] saveHistory error:', err)
    return false
  }
}

/**
 * Delete the conversation history file.
 * @returns {boolean}
 */
export function clearHistory() {
  try {
    const p = getHistoryPath()
    if (existsSync(p)) unlinkSync(p)
    return true
  } catch (err) {
    console.error('[store] clearHistory error:', err)
    return false
  }
}
