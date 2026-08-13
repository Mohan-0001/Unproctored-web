import { app, shell, BrowserWindow, ipcMain, desktopCapturer, globalShortcut } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { loadSettings, saveSettings, loadHistory, saveHistory, clearHistory } from './store'
const { uIOhook, UiohookKey } = require('uiohook-napi')

// ─── State ───────────────────────────────────────────────────────────────────
let mainWindow
let isTypingMode = false
let capturedText = ''
let isScreenProtected = false
let currentSettings = null // loaded after app ready
let capsLockOn = false

// ─── Key map (scan code → char) ──────────────────────────────────────────────
const keyMap = {
  [UiohookKey.A]: 'a', [UiohookKey.B]: 'b', [UiohookKey.C]: 'c', [UiohookKey.D]: 'd',
  [UiohookKey.E]: 'e', [UiohookKey.F]: 'f', [UiohookKey.G]: 'g', [UiohookKey.H]: 'h',
  [UiohookKey.I]: 'i', [UiohookKey.J]: 'j', [UiohookKey.K]: 'k', [UiohookKey.L]: 'l',
  [UiohookKey.M]: 'm', [UiohookKey.N]: 'n', [UiohookKey.O]: 'o', [UiohookKey.P]: 'p',
  [UiohookKey.Q]: 'q', [UiohookKey.R]: 'r', [UiohookKey.S]: 's', [UiohookKey.T]: 't',
  [UiohookKey.U]: 'u', [UiohookKey.V]: 'v', [UiohookKey.W]: 'w', [UiohookKey.X]: 'x',
  [UiohookKey.Y]: 'y', [UiohookKey.Z]: 'z', [UiohookKey.Space]: ' ',
  [UiohookKey['1']]: '1', [UiohookKey['2']]: '2', [UiohookKey['3']]: '3',
  [UiohookKey['4']]: '4', [UiohookKey['5']]: '5', [UiohookKey['6']]: '6',
  [UiohookKey['7']]: '7', [UiohookKey['8']]: '8', [UiohookKey['9']]: '9',
  [UiohookKey['0']]: '0',
  [UiohookKey.Comma]: ',', [UiohookKey.Period]: '.', [UiohookKey.Slash]: '/',
  [UiohookKey.Semicolon]: ';', [UiohookKey.Quote]: "'", [UiohookKey.BracketLeft]: '[',
  [UiohookKey.BracketRight]: ']', [UiohookKey.Backslash]: '\\', [UiohookKey.Minus]: '-',
  [UiohookKey.Equal]: '=', [UiohookKey.Backquote]: '`'
}

const shiftKeyMap = {
  '1': '!', '2': '@', '3': '#', '4': '$', '5': '%', '6': '^', '7': '&', '8': '*', '9': '(', '0': ')',
  '-': '_', '=': '+', '[': '{', ']': '}', '\\': '|', ';': ':', "'": '"', ',': '<', '.': '>', '/': '?', '`': '~'
}

// ─── Shortcut action handlers ─────────────────────────────────────────────────
const moveWindow = (dx, dy) => {
  if (!mainWindow) return
  const [x, y] = mainWindow.getPosition()
  mainWindow.setPosition(x + dx, y + dy)
}

const ghostModeHandler = () => {
  isScreenProtected = !isScreenProtected
  if (mainWindow) {
    mainWindow.setIgnoreMouseEvents(isScreenProtected)
    mainWindow.webContents.send('protection-toggled', isScreenProtected)
  }
}

const sendMessageHandler = () => {
  if (mainWindow) {
    capturedText = ''
    mainWindow.webContents.send('trigger-send')
  }
}

const captureScreenHandler = async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1920, height: 1080 }
    })
    if (sources && sources.length > 0 && mainWindow) {
      mainWindow.webContents.send('screenshot-captured', sources[0].thumbnail.toDataURL())
    }
  } catch (err) {
    console.error('[main] captureScreen error:', err)
  }
}

const ghostTypingHandler = () => {
  isTypingMode = !isTypingMode
  if (isTypingMode) {
    capturedText = ''
    uIOhook.start()
  } else {
    uIOhook.stop()
  }
  mainWindow?.webContents.send('typing-mode-toggled', isTypingMode)
}

const toggleVisibilityHandler = () => {
  if (!mainWindow) return
  if (mainWindow.isVisible()) {
    mainWindow.hide()
  } else {
    mainWindow.setAlwaysOnTop(true, 'screen-saver')
    mainWindow.showInactive()
    mainWindow.setSkipTaskbar(true)
  }
}

const quitAppHandler = () => app.quit()

// ─── Dynamic shortcut registration ───────────────────────────────────────────
const registeredShortcuts = new Set()

function unregisterAll() {
  registeredShortcuts.forEach((sc) => {
    try { globalShortcut.unregister(sc) } catch (_) {}
  })
  registeredShortcuts.clear()
}

function register(combo, handler) {
  if (!combo) return
  try {
    const ok = globalShortcut.register(combo, handler)
    if (ok) registeredShortcuts.add(combo)
    else console.warn('[shortcuts] failed to register:', combo)
  } catch (err) {
    console.error('[shortcuts] error registering', combo, err)
  }
}

function registerAllShortcuts(sc) {
  unregisterAll()
  register(sc.moveUp, () => moveWindow(0, -15))
  register(sc.moveDown, () => moveWindow(0, 15))
  register(sc.moveLeft, () => moveWindow(-15, 0))
  register(sc.moveRight, () => moveWindow(15, 0))
  register(sc.ghostMode, ghostModeHandler)
  register(sc.sendMessage, sendMessageHandler)
  register(sc.captureScreen, captureScreenHandler)
  register(sc.ghostTyping, ghostTypingHandler)
  register(sc.toggleVisibility, toggleVisibilityHandler)
  register(sc.scrollUp, () => mainWindow?.webContents.send('scroll-ui', -50))
  register(sc.scrollDown, () => mainWindow?.webContents.send('scroll-ui', 50))
  register(sc.quitApp, quitAppHandler)
}

// ─── Window creation ──────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 725,
    height: 495,
    show: false,
    frame: false,
    transparent: true,
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    skipTaskbar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: false
    }
  })

  mainWindow.setAlwaysOnTop(true, 'screen')

  if (process.platform === 'darwin') {
    mainWindow.setHiddenInMissionControl(true)
  } else if (process.platform === 'win32') {
    mainWindow.setContentProtection(true)
  }

  mainWindow.on('ready-to-show', () => mainWindow.show())

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// ─── App lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Load persisted settings and register shortcuts
  currentSettings = loadSettings()
  registerAllShortcuts(currentSettings.shortcuts)

  createWindow()

  // ── IPC: ping test ────────────────────────────────────────────────────────
  ipcMain.on('ping', () => console.log('pong'))

  // ── IPC: reset typing buffer ──────────────────────────────────────────────
  ipcMain.on('reset-typing-buffer', () => { capturedText = '' })

  // ── IPC: capture screen (on-demand) ──────────────────────────────────────
  ipcMain.handle('capture-screen', async () => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1920, height: 1080 }
      })
      return sources?.length > 0 ? sources[0].thumbnail.toDataURL() : null
    } catch (err) {
      console.error('[main] capture-screen IPC error:', err)
      return null
    }
  })

  // ── IPC: load settings ────────────────────────────────────────────────────
  ipcMain.handle('load-settings', () => {
    currentSettings = loadSettings()
    return currentSettings
  })

  // ── IPC: save settings + re-register shortcuts ────────────────────────────
  ipcMain.handle('save-settings', async (_, settings) => {
    try {
      const ok = saveSettings(settings)
      if (ok) {
        currentSettings = settings
        registerAllShortcuts(settings.shortcuts)
      }
      return { success: ok }
    } catch (err) {
      console.error('[main] save-settings error:', err)
      return { success: false, error: err.message }
    }
  })

  // ── IPC: load conversation history ────────────────────────────────────────
  ipcMain.handle('load-history', () => {
    return loadHistory()
  })

  // ── IPC: save conversation history ────────────────────────────────────────
  ipcMain.handle('save-history', async (_, messages) => {
    const ok = saveHistory(messages)
    return { success: ok }
  })

  // ── IPC: clear conversation history ───────────────────────────────────────
  ipcMain.handle('clear-history', () => {
    const ok = clearHistory()
    return { success: ok }
  })

  // ── Ghost typing key capture ──────────────────────────────────────────────
  uIOhook.on('keydown', (e) => {
    if (!isTypingMode) return
    if (e.keycode === UiohookKey.Backspace) {
      capturedText = capturedText.slice(0, -1)
    } else if (e.keycode === UiohookKey.Enter) {
      if (e.shiftKey) {
        capturedText += '\n'
      }
    } else if (e.keycode === UiohookKey.Tab) {
      capturedText += '    '
    } else if (e.keycode === UiohookKey.CapsLock) {
      capsLockOn = !capsLockOn
    } else {
      let char = keyMap[e.keycode]
      if (char) {
        if (e.shiftKey) {
          if (shiftKeyMap[char]) {
            char = shiftKeyMap[char]
          } else if (/[a-z]/.test(char)) {
            char = capsLockOn ? char.toLowerCase() : char.toUpperCase()
          }
        } else {
          if (/[a-z]/.test(char) && capsLockOn) {
            char = char.toUpperCase()
          }
        }
        capturedText += char
      }
    }
    mainWindow?.webContents.send('update-text', capturedText)
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  uIOhook.stop()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
