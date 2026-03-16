import Anthropic from '@anthropic-ai/sdk'
import { LLMProvider, ChatMessage, StreamCallbacks } from './types'

export const anthropicProvider: LLMProvider = {
  id: 'anthropic',
  displayName: 'Anthropic',
  models: ['claude-sonnet-4-5-20250514', 'claude-haiku-4-5-20251001', 'claude-3-5-haiku-20241022'],

  async validateKey(apiKey: string): Promise<void> {
    const client = new Anthropic({ apiKey })
    await client.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'hi' }],
    })
  },

  stream(messages: ChatMessage[], model: string, apiKey: string, callbacks: StreamCallbacks, systemPrompt?: string): () => void {
    const client = new Anthropic({ apiKey })
    const controller = new AbortController()
    let fullText = ''

    ;(async () => {
      try {
        const stream = client.messages.stream(
          {
            model,
            max_tokens: 8192,
            messages: messages.map((m) => ({ role: m.role, content: m.content })),
            ...(systemPrompt ? { system: systemPrompt } : {}),
          },
          { signal: controller.signal }
        )

        stream.on('text', (text) => {
          fullText += text
          callbacks.onChunk(text)
        })

        await stream.finalMessage()
        callbacks.onDone(fullText)
      } catch (err) {
        if (controller.signal.aborted) return
        callbacks.onError(err instanceof Error ? err : new Error(String(err)))
      }
    })()

    return () => controller.abort()
  },
}
