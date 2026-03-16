import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { initDatabase, getSessions, createSession, deleteSession, createMessage } from './database'
import { initSettings, getApiKey, setApiKey, hasApiKey, getActiveProvider, setActiveProvider, getActiveModel, setActiveModel, getSystemPrompt, setSystemPrompt } from './settings'
import { providers } from './providers'
import { requestDeviceCode, pollForToken } from './copilot-auth'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null = null
let currentAbort: (() => void) | null = null

function createWindow(): void {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
    frame: false,
    titleBarStyle: 'hiddenInset',
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

ipcMain.on('window-minimize', () => {
  win?.minimize()
})

ipcMain.on('window-maximize', () => {
  if (win?.isMaximized()) {
    win.unmaximize()
  } else {
    win?.maximize()
  }
})

ipcMain.on('window-close', () => {
  win?.close()
})

app.whenReady().then(() => {
  initDatabase()
  initSettings()

  // Database handlers
  ipcMain.handle('db:sessions:list', () => getSessions())
  ipcMain.handle('db:sessions:create', (_e, { id }) => createSession(id))
  ipcMain.handle('db:sessions:delete', (_e, { id }) => deleteSession(id))
  ipcMain.handle('db:messages:create', (_e, { sessionId, message }) => createMessage(sessionId, message))

  // LLM handlers
  ipcMain.handle('llm:chat', (_e, { sessionId, messages }) => {
    const providerId = getActiveProvider()
    const provider = providers[providerId]
    if (!provider) {
      win?.webContents.send('llm:error', { sessionId, error: `Unknown provider: ${providerId}` })
      return
    }

    const apiKey = getApiKey(providerId)
    if (!apiKey) {
      win?.webContents.send('llm:error', { sessionId, error: 'API Key not configured. Please set it in Settings.' })
      return
    }

    const model = getActiveModel() ?? provider.models[0]

    const systemPrompt = getSystemPrompt()

    currentAbort = provider.stream(messages, model, apiKey, {
      onChunk: (text) => {
        win?.webContents.send('llm:chunk', { sessionId, text })
      },
      onDone: (fullText) => {
        currentAbort = null
        win?.webContents.send('llm:done', { sessionId, fullText })
      },
      onError: (error) => {
        currentAbort = null
        win?.webContents.send('llm:error', { sessionId, error: error.message })
      },
    }, systemPrompt)
  })

  ipcMain.on('llm:abort', () => {
    currentAbort?.()
    currentAbort = null
  })

  // Settings handlers
  ipcMain.handle('settings:get-providers', () => {
    return Object.values(providers).map((p) => ({
      id: p.id,
      displayName: p.displayName,
      models: p.models,
      authType: p.authType ?? 'apikey',
    }))
  })

  ipcMain.handle('settings:get-active', () => {
    const providerId = getActiveProvider()
    const provider = providers[providerId]
    return {
      provider: providerId,
      model: getActiveModel() ?? provider?.models[0] ?? null,
    }
  })

  ipcMain.handle('settings:set-active', (_e, { provider, model }) => {
    setActiveProvider(provider)
    setActiveModel(model)
  })

  ipcMain.handle('settings:set-api-key', async (_e, { providerId, apiKey }) => {
    const provider = providers[providerId]
    if (!provider) throw new Error(`Unknown provider: ${providerId}`)
    await provider.validateKey(apiKey)
    setApiKey(providerId, apiKey)
  })

  ipcMain.handle('settings:has-api-key', (_e, { providerId }) => {
    return hasApiKey(providerId)
  })

  ipcMain.handle('settings:get-system-prompt', () => {
    return getSystemPrompt()
  })

  ipcMain.handle('settings:set-system-prompt', (_e, { prompt }) => {
    setSystemPrompt(prompt)
  })

  // Copilot OAuth handlers
  ipcMain.handle('copilot:start-auth', async () => {
    const data = await requestDeviceCode()
    shell.openExternal(data.verification_uri)
    return { deviceCode: data.device_code, userCode: data.user_code, interval: data.interval, expiresIn: data.expires_in }
  })

  ipcMain.handle('copilot:poll-auth', async (_e, { deviceCode }) => {
    const result = await pollForToken(deviceCode)
    if (result.status === 'token' && result.token) {
      setApiKey('copilot', result.token)
    }
    return result
  })

  ipcMain.handle('copilot:fetch-models', async () => {
    const githubToken = getApiKey('copilot')
    if (!githubToken) throw new Error('Not signed in to GitHub Copilot')
    const provider = providers['copilot']
    if (!provider.fetchModels) throw new Error('Provider does not support fetchModels')
    return provider.fetchModels(githubToken)
  })

  createWindow()
})
