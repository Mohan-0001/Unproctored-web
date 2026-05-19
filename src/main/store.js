import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'

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
  geminiApiKeys: ['', ''],
  shortcuts: { ...DEFAULT_SHORTCUTS }
}

function getStorePath() {
  return join(app.getPath('userData'), 'covert-settings.json')
}

/**
 * Load settings from disk. Falls back to defaults on error.
 * @returns {{ geminiApiKeys: string[], shortcuts: Record<string,string> }}
 */
export function loadSettings() {
  try {
    const p = getStorePath()
    if (existsSync(p)) {
      const parsed = JSON.parse(readFileSync(p, 'utf-8'))
      return {
        geminiApiKeys: Array.isArray(parsed.geminiApiKeys)
          ? parsed.geminiApiKeys
          : DEFAULT_SETTINGS.geminiApiKeys,
        shortcuts: { ...DEFAULT_SHORTCUTS, ...(parsed.shortcuts || {}) }
      }
    }
  } catch (err) {
    console.error('[store] loadSettings error:', err)
  }
  return {
    geminiApiKeys: ['', ''],
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
