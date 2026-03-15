import { LLMProvider } from './types'
import { openaiProvider } from './openai'
import { anthropicProvider } from './anthropic'

export const providers: Record<string, LLMProvider> = {
  openai: openaiProvider,
  anthropic: anthropicProvider,
}
