import OpenAI from 'openai'
import { LLMProvider, ChatMessage, StreamCallbacks } from './types'

export const openaiProvider: LLMProvider = {
  id: 'openai',
  displayName: 'OpenAI',
  models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano', 'o4-mini'],

  async validateKey(apiKey: string): Promise<void> {
    const client = new OpenAI({ apiKey })
    await client.models.list()
  },

  stream(messages: ChatMessage[], model: string, apiKey: string, callbacks: StreamCallbacks): () => void {
    const client = new OpenAI({ apiKey })
    const controller = new AbortController()
    let fullText = ''

    ;(async () => {
      try {
        const stream = await client.chat.completions.create(
          {
            model,
            messages: messages.map((m) => ({ role: m.role, content: m.content })),
            stream: true,
          },
          { signal: controller.signal }
        )

        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content
          if (delta) {
            fullText += delta
            callbacks.onChunk(delta)
          }
        }

        callbacks.onDone(fullText)
      } catch (err) {
        if (controller.signal.aborted) return
        callbacks.onError(err instanceof Error ? err : new Error(String(err)))
      }
    })()

    return () => controller.abort()
  },
}
