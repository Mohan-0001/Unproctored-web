import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Helper: attach a listener and return a cleanup function that removes it
function on(channel, cb) {
  const handler = (_event, ...args) => cb(...args)
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.removeListener(channel, handler)
}

const api = {
  // ── Renderer ← Main events (each returns a cleanup fn) ─────────────────
  onProtectionToggled:  (cb) => on('protection-toggled',  cb),
  onScreenshotCaptured: (cb) => on('screenshot-captured', cb),
  onTypingModeToggled:  (cb) => on('typing-mode-toggled', cb),
  onUpdateText:         (cb) => on('update-text',         cb),
  onTriggerSend:        (cb) => on('trigger-send',        cb),
  onScrollUI:           (cb) => on('scroll-ui',           cb),

  // ── Renderer → Main one-way ─────────────────────────────────────────────
  resetTypingBuffer: () => ipcRenderer.send('reset-typing-buffer'),

  // ── Settings two-way (invoke / handle) ──────────────────────────────────
  loadSettings:  ()         => ipcRenderer.invoke('load-settings'),
  saveSettings:  (settings) => ipcRenderer.invoke('save-settings', settings),

  // ── History two-way (invoke / handle) ───────────────────────────────────
  loadHistory:  ()         => ipcRenderer.invoke('load-history'),
  saveHistory:  (messages) => ipcRenderer.invoke('save-history', messages),
  clearHistory: ()         => ipcRenderer.invoke('clear-history')
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}
