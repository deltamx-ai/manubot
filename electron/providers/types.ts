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
  readonly authType?: 'apikey' | 'oauth'
  validateKey(apiKey: string): Promise<void>
  fetchModels?(apiKey: string): Promise<string[]>
  stream(messages: ChatMessage[], model: string, apiKey: string, callbacks: StreamCallbacks, systemPrompt?: string): () => void
}
