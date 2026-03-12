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
