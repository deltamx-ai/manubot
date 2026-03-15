export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface StreamCallbacks {
  onChunk: (text: string) => void
  onDone: (fullText: string) => void
  onError: (error: Error) => void
}

export interface LLMProvider {
  readonly id: string
  readonly displayName: string
  readonly models: string[]
  validateKey(apiKey: string): Promise<void>
  stream(messages: ChatMessage[], model: string, apiKey: string, callbacks: StreamCallbacks): () => void
}
