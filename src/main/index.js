import { app, shell, BrowserWindow, ipcMain, desktopCapturer, globalShortcut } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
const { uIOhook, UiohookKey } = require('uiohook-napi')


let mainWindow;
let isTypingMode = false;
let capturedText = '';

// Mapping native scan codes to characters
const keyMap = {
  [UiohookKey.A]: 'a', [UiohookKey.B]: 'b', [UiohookKey.C]: 'c', [UiohookKey.D]: 'd',
  [UiohookKey.E]: 'e', [UiohookKey.F]: 'f', [UiohookKey.G]: 'g', [UiohookKey.H]: 'h',
  [UiohookKey.I]: 'i', [UiohookKey.J]: 'j', [UiohookKey.K]: 'k', [UiohookKey.L]: 'l',
  [UiohookKey.M]: 'm', [UiohookKey.N]: 'n', [UiohookKey.O]: 'o', [UiohookKey.P]: 'p',
  [UiohookKey.Q]: 'q', [UiohookKey.R]: 'r', [UiohookKey.S]: 's', [UiohookKey.T]: 't',
  [UiohookKey.U]: 'u', [UiohookKey.V]: 'v', [UiohookKey.W]: 'w', [UiohookKey.X]: 'x',
  [UiohookKey.Y]: 'y', [UiohookKey.Z]: 'z', [UiohookKey.Space]: ' ',
  [UiohookKey['1']]: '1', [UiohookKey['2']]: '2', [UiohookKey['3']]: '3', [UiohookKey['4']]: '4',
  [UiohookKey['5']]: '5', [UiohookKey['6']]: '6', [UiohookKey['7']]: '7', [UiohookKey['8']]: '8',
  [UiohookKey['9']]: '9', [UiohookKey['0']]: '0',
  [UiohookKey.Comma]: ',', [UiohookKey.Period]: '.', [UiohookKey.Slash]: '/',
  [UiohookKey.Semicolon]: ';', [UiohookKey.Quote]: "'", [UiohookKey.BracketLeft]: '[',
  [UiohookKey.BracketRight]: ']', [UiohookKey.Backslash]: '\\', [UiohookKey.Minus]: '-',
  [UiohookKey.Equal]: '=', [UiohookKey.Backquote]: '`',
};

function createWindow() {
  // Create the browser window.
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
      sandbox: false
    }
  })


  mainWindow.setAlwaysOnTop(true, 'screen')

  if (process.platform === 'darwin') {
    mainWindow.setHiddenInMissionControl(true)
  } else if (process.platform === 'win32') {
    mainWindow.setContentProtection(true)
  }

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  ipcMain.handle('capture-screen', async () => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1920, height: 1080 }
      })
      if (sources && sources.length > 0) {
        return sources[0].thumbnail.toDataURL()
      }
      return null
    } catch (err) {
      console.error('Error capturing screen:', err)
      return null
    }
  })

  createWindow()

  const moveWindow = (dx, dy) => {
    if (mainWindow) {
      const [x, y] = mainWindow.getPosition()
      mainWindow.setPosition(x + dx, y + dy)
    }
  }

  globalShortcut.register('CommandOrControl+Up', () => moveWindow(0, -15))
  globalShortcut.register('CommandOrControl+Down', () => moveWindow(0, 15))
  globalShortcut.register('CommandOrControl+Left', () => moveWindow(-15, 0))
  globalShortcut.register('CommandOrControl+Right', () => moveWindow(15, 0))

  let isScreenProtected = false
  globalShortcut.register('CommandOrControl+H', () => {
    isScreenProtected = !isScreenProtected
    if (mainWindow) {
      // mainWindow.setContentProtection(isScreenProtected)
      mainWindow.setIgnoreMouseEvents(isScreenProtected);
      mainWindow.webContents.send('protection-toggled', isScreenProtected)
    }
  })

  // globalShortcut.register('CommandOrControl+Enter', () => {
  //   if (mainWindow) {
  //     mainWindow.webContents.send('trigger-send')
  //   }
  // })

  globalShortcut.register('CommandOrControl+Enter', () => {
    if (mainWindow) {
      capturedText = ''; // Clear memory immediately
      mainWindow.webContents.send('trigger-send')
    }
  })

  globalShortcut.register('Shift+Up', () => {
    if (mainWindow) {
      mainWindow.webContents.send('scroll-ui', -50)
    }
  })

  globalShortcut.register('Shift+Down', () => {
    if (mainWindow) {
      mainWindow.webContents.send('scroll-ui', 50)
    }
  })

  globalShortcut.register('CommandOrControl+M', () => {
    if (!mainWindow) return;

    if (mainWindow.isVisible()) {
      mainWindow.hide();

    } else {
      // 1. Set the level BEFORE showing to ensure it stays on top of Chrome
      mainWindow.setAlwaysOnTop(true, 'screen-saver');

      // 2. Show without stealing focus
      mainWindow.showInactive();

      // 3. Ensure it doesn't show in the taskbar
      mainWindow.setSkipTaskbar(true);

      // 4. Start listening for keys again
    }
  });

  ipcMain.on('reset-typing-buffer', () => {
    capturedText = '';
  });

  globalShortcut.register('CommandOrControl+S', async () => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1920, height: 1080 }
      })
      if (sources && sources.length > 0 && mainWindow) {
        const imgDataUrl = sources[0].thumbnail.toDataURL()
        mainWindow.webContents.send('screenshot-captured', imgDataUrl)
      }
    } catch (err) {
      console.error('Error capturing screen in global shortcut:', err)
    }
  })


  globalShortcut.register('CommandOrControl+T', () => {
    isTypingMode = !isTypingMode;

    if (isTypingMode) {
      console.log("🔴 Mode: ON (Capturing keys)");
      capturedText = ''; // Reset buffer when starting
      uIOhook.start();
    } else {
      console.log("🟢 Mode: OFF. Final Text:", capturedText);
      uIOhook.stop();
    }

    if (mainWindow) {
      mainWindow.webContents.send('typing-mode-toggled', isTypingMode);
    }
  });

  uIOhook.on('keydown', (e) => {
    if (!isTypingMode) return;

    // Handle Backspace
    if (e.keycode === UiohookKey.Backspace) {
      capturedText = capturedText.slice(0, -1);
    } else if (e.keycode === UiohookKey.Enter) {
      // Optional: Handle Enter if needed, or ignore
      // capturedText += '\n'; 
    } else {
      let char = keyMap[e.keycode];
      if (char) {
        if (e.shiftKey) char = char.toUpperCase();
        capturedText += char;
      }
    }

    // Update the UI with the full captured buffer
    if (mainWindow) {
      mainWindow.webContents.send('update-text', capturedText);
    }
  });

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  uIOhook.stop();
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
