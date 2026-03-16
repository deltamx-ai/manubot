import { LLMProvider } from './types'
import { openaiProvider } from './openai'
import { anthropicProvider } from './anthropic'
import { copilotProvider } from './copilot'

export const providers: Record<string, LLMProvider> = {
  openai: openaiProvider,
  anthropic: anthropicProvider,
  copilot: copilotProvider,
}
