import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
// const api = {
//   onProtectionToggled: (callback) => ipcRenderer.on('protection-toggled', (_event, value) => callback(value)),
//   onScreenshotCaptured: (callback) => ipcRenderer.on('screenshot-captured', (_event, value) => callback(value))
// }

const api = {
  onProtectionToggled: (callback) => ipcRenderer.on('protection-toggled', (_event, value) => callback(value)),
  onScreenshotCaptured: (callback) => ipcRenderer.on('screenshot-captured', (_event, value) => callback(value)),

  onTypingModeToggled: (callback) => ipcRenderer.on('typing-mode-toggled', (_event, value) => callback(value)),
  onUpdateText: (callback) => ipcRenderer.on('update-text', (_event, text) => callback(text)),
  onTriggerSend: (callback) => ipcRenderer.on('trigger-send', () => callback()),
  onScrollUI: (callback) => ipcRenderer.on('scroll-ui', (_event, amount) => callback(amount)),
  resetTypingBuffer: () => ipcRenderer.send('reset-typing-buffer'),
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
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
