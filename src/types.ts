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
      createSession: (id: string, title: string) => Promise<void>
      deleteSession: (id: string) => Promise<void>
      createMessage: (sessionId: string, message: { id: string; content: string; sender: string; timestamp: string }) => Promise<void>
    }
  }
}
