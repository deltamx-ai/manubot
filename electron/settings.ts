import { safeStorage } from 'electron'
import { getSetting, setSetting } from './database'

let encryptionAvailable = false

export function initSettings(): void {
  encryptionAvailable = safeStorage.isEncryptionAvailable()
  if (!encryptionAvailable) {
    console.warn('safeStorage encryption not available, API keys will be stored in plaintext')
  }
}

function encrypt(value: string): string {
  if (!encryptionAvailable) return value
  return safeStorage.encryptString(value).toString('base64')
}

function decrypt(value: string): string {
  if (!encryptionAvailable) return value
  return safeStorage.decryptString(Buffer.from(value, 'base64'))
}

export function setApiKey(providerId: string, key: string): void {
  setSetting(`apikey:${providerId}`, encrypt(key))
}

export function getApiKey(providerId: string): string | null {
  const raw = getSetting(`apikey:${providerId}`)
  if (!raw) return null
  return decrypt(raw)
}

export function hasApiKey(providerId: string): boolean {
  return getSetting(`apikey:${providerId}`) !== null
}

export function getActiveProvider(): string {
  return getSetting('active:provider') ?? 'openai'
}

export function setActiveProvider(providerId: string): void {
  setSetting('active:provider', providerId)
}

export function getActiveModel(): string | null {
  return getSetting('active:model')
}

export function setActiveModel(model: string): void {
  setSetting('active:model', model)
}

const DEFAULT_SYSTEM_PROMPT =
  'You are Manubot, a helpful AI assistant. You provide clear, accurate, and thoughtful responses. You can help with writing, analysis, coding, math, creative tasks, and general knowledge questions. When you\'re unsure about something, you say so honestly. You format responses with Markdown when appropriate.'

export function getSystemPrompt(): string {
  return getSetting('system:prompt') ?? DEFAULT_SYSTEM_PROMPT
}

export function setSystemPrompt(prompt: string): void {
  setSetting('system:prompt', prompt)
}
