# Plan: 添加 LLM Provider 支持

## Context

Manubot 目前是一个纯本地聊天 UI，用户发消息后没有 AI 回复。需要接入 LLM Provider（OpenAI、Anthropic），支持流式响应，API Key 加密存储在 SQLite 中。

## 架构设计

```
Renderer (React)                    Main Process (Electron)
  │                                     │
  │── invoke('llm:chat', msgs) ──────>  │  provider.stream(msgs, model, key, {
  │<── send('llm:chunk', text) ───────  │    onChunk → win.send('llm:chunk')
  │<── send('llm:chunk', text) ───────  │    onDone  → win.send('llm:done')
  │<── send('llm:done', full) ────────  │    onError → win.send('llm:error')
  │                                     │  })
  │── send('llm:abort') ─────────────> │  abortFn()
```

- API 调用在 main process（安全）
- 流式推送用 `webContents.send`（多次推送 chunk）
- 每条事件带 `sessionId` 防止切换 session 后 chunk 错位

## 实现步骤

### Step 1: 安装依赖

```bash
npm install openai @anthropic-ai/sdk
```

`vite.config.ts` 的 `rollupOptions.external` 添加 `'openai'`, `'@anthropic-ai/sdk'`。

### Step 2: Provider 抽象层

新建 `electron/providers/` 目录：

**`electron/providers/types.ts`** — 通用接口：
```typescript
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
  stream(messages: ChatMessage[], model: string, apiKey: string, callbacks: StreamCallbacks): () => void  // 返回 abort 函数
}
```

**`electron/providers/openai.ts`** — OpenAI 实现：用 `openai` SDK，`chat.completions.create({ stream: true })`，`AbortController` 取消。

**`electron/providers/anthropic.ts`** — Anthropic 实现：用 `@anthropic-ai/sdk`，`messages.stream()` + `.on('text', ...)`。

**`electron/providers/index.ts`** — Provider 注册表：
```typescript
export const providers: Record<string, LLMProvider> = { openai: openaiProvider, anthropic: anthropicProvider }
```

### Step 3: Settings 存储（加密）

**`electron/database.ts`** — 新增 `settings` 表：
```sql
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
```
导出 `setSetting(key, value)` 和 `getSetting(key): string | null`。

**`electron/settings.ts`** — 加密层：
- 用 Electron 内置 `safeStorage.encryptString()` / `decryptString()` 加密 API Key
- 导出：`setApiKey(providerId, key)`, `getApiKey(providerId)`, `getActiveProvider()`, `getActiveModel()`, `setActiveProvider()`, `setActiveModel()`
- 启动时检查 `safeStorage.isEncryptionAvailable()`，不可用则 fallback 明文存储并警告

### Step 4: IPC 接口

**`electron/main.ts`** — 新增 handler：
- `llm:chat` — 启动流式对话，chunk/done/error 通过 `webContents.send` 推送
- `llm:abort` — 取消当前流
- `settings:get-providers` — 返回可用 provider 列表
- `settings:get-active` — 返回当前 provider 和 model
- `settings:set-active` — 设置 provider 和 model
- `settings:set-api-key` — 验证 key 后加密存储
- `settings:has-api-key` — 检查是否已配置 key

**`electron/preload.ts`** — 暴露 `window.llm` 和 `window.settings`。

### Step 5: 类型定义

**`src/types.ts`** — 添加 `Window.llm` 和 `Window.settings` 类型声明。

### Step 6: 前端流式状态

**`src/App.tsx`**：
- 新增状态：`isStreaming`, `streamingMessageId` ref
- `handleSendMessage` 修改：发送用户消息后，创建空的 bot 消息占位，调用 `window.llm.chat()`
- `useEffect` 注册 `llm:chunk/done/error` 监听器
  - `onChunk`: 追加文本到 bot 消息（用 `setSessions(prev => ...)` 避免闭包陷阱）
  - `onDone`: 持久化 bot 消息到 DB，`isStreaming = false`
  - `onError`: 显示错误，`isStreaming = false`

**`src/components/InputArea.tsx`**：
- 新增 `isStreaming` prop
- streaming 时 Send 按钮变为 Stop 按钮，点击调用 `window.llm.abort()`

### Step 7: Settings UI

**`src/components/SettingsModal.tsx`** — 新建：
- Provider 下拉选择（OpenAI / Anthropic）
- Model 下拉选择（根据 provider 变化）
- API Key 输入框（password 类型）+ 保存按钮
- 已配置状态指示

**`src/components/Sidebar.tsx`** — 底部添加设置齿轮按钮，点击打开 SettingsModal。

## 涉及文件

| 文件 | 操作 |
|------|------|
| `electron/providers/types.ts` | **新建** — Provider 接口 |
| `electron/providers/openai.ts` | **新建** — OpenAI 实现 |
| `electron/providers/anthropic.ts` | **新建** — Anthropic 实现 |
| `electron/providers/index.ts` | **新建** — Provider 注册表 |
| `electron/settings.ts` | **新建** — 加密 settings 存储 |
| `src/components/SettingsModal.tsx` | **新建** — Settings UI |
| `electron/database.ts` | **修改** — 添加 settings 表 |
| `electron/main.ts` | **修改** — 添加 llm + settings IPC handler |
| `electron/preload.ts` | **修改** — 暴露 llm + settings 接口 |
| `src/types.ts` | **修改** — 添加 Window.llm, Window.settings 类型 |
| `src/App.tsx` | **修改** — 流式状态、chunk 监听、handleSendMessage |
| `src/components/InputArea.tsx` | **修改** — Send/Stop 切换 |
| `src/components/Sidebar.tsx` | **修改** — 添加设置按钮 |
| `vite.config.ts` | **修改** — external 添加 SDK |
| `package.json` | **修改** — 添加依赖 |

## 验证方式

1. 打开设置，配置 OpenAI API Key，保存成功
2. 选择 model（如 gpt-4o），发送消息，确认流式逐字显示回复
3. 流式过程中点击 Stop，确认停止生成
4. 切换到 Anthropic，配置 key，发送消息，确认正常回复
5. 重启应用，确认 API Key 和 provider 设置保留
6. 不配置 key 时发消息，确认显示错误提示
