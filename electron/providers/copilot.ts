import OpenAI from 'openai'
import { LLMProvider, ChatMessage, StreamCallbacks } from './types'
import { getCopilotToken } from '../copilot-auth'

export const copilotProvider: LLMProvider = {
  id: 'copilot',
  displayName: 'GitHub Copilot',
  models: [],
  authType: 'oauth',

  async validateKey(githubToken: string): Promise<void> {
    await getCopilotToken(githubToken)
  },

  async fetchModels(githubToken: string): Promise<string[]> {
    const copilotToken = await getCopilotToken(githubToken)
    const res = await fetch('https://api.githubcopilot.com/models', {
      headers: {
        Authorization: `Bearer ${copilotToken}`,
        'Copilot-Integration-Id': 'vscode-chat',
      },
    })
    if (!res.ok) {
      throw new Error(`Failed to fetch models: ${res.status}`)
    }
    const data = await res.json()
    return data.data
      .filter((m: { capabilities?: { type?: string } }) => m.capabilities?.type === 'chat')
      .map((m: { id: string }) => m.id)
  },

  stream(messages: ChatMessage[], model: string, githubToken: string, callbacks: StreamCallbacks, systemPrompt?: string): () => void {
    const controller = new AbortController()
    let fullText = ''

    ;(async () => {
      try {
        const copilotToken = await getCopilotToken(githubToken)
        const client = new OpenAI({
          apiKey: copilotToken,
          baseURL: 'https://api.githubcopilot.com',
        })

        const apiMessages: { role: 'system' | 'user' | 'assistant'; content: string }[] =
          messages.map((m) => ({ role: m.role, content: m.content }))
        if (systemPrompt) {
          apiMessages.unshift({ role: 'system', content: systemPrompt })
        }

        const stream = await client.chat.completions.create(
          {
            model,
            messages: apiMessages,
            stream: true,
          },
          {
            signal: controller.signal,
            headers: { 'Copilot-Integration-Id': 'vscode-chat' },
          }
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
