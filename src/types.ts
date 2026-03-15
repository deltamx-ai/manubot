// 消息类型定义
export interface Message {
  id: string
  content: string
  sender: 'user' | 'bot'
  timestamp: Date
}

// 聊天会话类型定义
export interface ChatSession {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
}

// Provider 信息
export interface ProviderInfo {
  id: string
  displayName: string
  models: string[]
}

// window 全局类型声明
declare global {
  interface Window {
    windowControls: {
      minimize: () => void
      maximize: () => void
      close: () => void
    }
    storage: {
      loadSessions: () => Promise<{
        id: string
        title: string
        createdAt: string
        updatedAt: string
        messages: { id: string; content: string; sender: string; timestamp: string }[]
      }[]>
      createSession: (id: string) => Promise<string>
      deleteSession: (id: string) => Promise<void>
      createMessage: (sessionId: string, message: { id: string; content: string; sender: string; timestamp: string }) => Promise<void>
    }
    llm: {
      chat: (sessionId: string, messages: { role: string; content: string }[]) => Promise<void>
      abort: () => void
      onChunk: (callback: (data: { sessionId: string; text: string }) => void) => () => void
      onDone: (callback: (data: { sessionId: string; fullText: string }) => void) => () => void
      onError: (callback: (data: { sessionId: string; error: string }) => void) => () => void
    }
    settings: {
      getProviders: () => Promise<ProviderInfo[]>
      getActive: () => Promise<{ provider: string; model: string | null }>
      setActive: (provider: string, model: string) => Promise<void>
      setApiKey: (providerId: string, apiKey: string) => Promise<void>
      hasApiKey: (providerId: string) => Promise<boolean>
    }
  }
}
