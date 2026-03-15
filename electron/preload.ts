import { ipcRenderer, contextBridge } from 'electron'

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },

  // You can expose other APTs you need here.
  // ...
})

contextBridge.exposeInMainWorld('windowControls', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
})

contextBridge.exposeInMainWorld('storage', {
  loadSessions: () => ipcRenderer.invoke('db:sessions:list'),
  createSession: (id: string) => ipcRenderer.invoke('db:sessions:create', { id }),
  deleteSession: (id: string) => ipcRenderer.invoke('db:sessions:delete', { id }),
  createMessage: (sessionId: string, message: { id: string; content: string; sender: string; timestamp: string }) =>
    ipcRenderer.invoke('db:messages:create', { sessionId, message }),
})

contextBridge.exposeInMainWorld('llm', {
  chat: (sessionId: string, messages: { role: string; content: string }[]) =>
    ipcRenderer.invoke('llm:chat', { sessionId, messages }),
  abort: () => ipcRenderer.send('llm:abort'),
  onChunk: (callback: (data: { sessionId: string; text: string }) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, data: { sessionId: string; text: string }) => callback(data)
    ipcRenderer.on('llm:chunk', listener)
    return () => ipcRenderer.off('llm:chunk', listener)
  },
  onDone: (callback: (data: { sessionId: string; fullText: string }) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, data: { sessionId: string; fullText: string }) => callback(data)
    ipcRenderer.on('llm:done', listener)
    return () => ipcRenderer.off('llm:done', listener)
  },
  onError: (callback: (data: { sessionId: string; error: string }) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, data: { sessionId: string; error: string }) => callback(data)
    ipcRenderer.on('llm:error', listener)
    return () => ipcRenderer.off('llm:error', listener)
  },
})

contextBridge.exposeInMainWorld('settings', {
  getProviders: () => ipcRenderer.invoke('settings:get-providers'),
  getActive: () => ipcRenderer.invoke('settings:get-active'),
  setActive: (provider: string, model: string) => ipcRenderer.invoke('settings:set-active', { provider, model }),
  setApiKey: (providerId: string, apiKey: string) => ipcRenderer.invoke('settings:set-api-key', { providerId, apiKey }),
  hasApiKey: (providerId: string) => ipcRenderer.invoke('settings:has-api-key', { providerId }),
})
