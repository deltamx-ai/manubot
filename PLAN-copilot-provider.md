# Plan: 添加 GitHub Copilot Provider（OAuth Device Flow 认证）

## Context

用户没有 OpenAI 付费账号，希望通过 GitHub Copilot 订阅来使用 LLM。Copilot 的 API 兼容 OpenAI 格式，但认证方式不同——需要通过 GitHub OAuth Device Flow 获取令牌，而非手动输入 API Key。

## 整体架构

变更分 6 层，自底向上：

1. **类型层** — 扩展 `LLMProvider` 接口
2. **认证层** — 新建 `electron/copilot-auth.ts`
3. **Provider 层** — 新建 `electron/providers/copilot.ts`
4. **IPC 层** — `main.ts` 新增 handlers，`preload.ts` 暴露 bridge
5. **前端类型层** — `src/types.ts` 扩展
6. **UI 层** — `SettingsModal.tsx` 条件渲染 OAuth UI

## 实现步骤

### 1. 扩展 Provider 接口

**`electron/providers/types.ts`** — 新增两个可选字段：

```typescript
export interface LLMProvider {
  readonly id: string
  readonly displayName: string
  readonly models: string[]
  readonly authType?: 'apikey' | 'oauth'           // 新增
  validateKey(apiKey: string): Promise<void>
  fetchModels?(apiKey: string): Promise<string[]>   // 新增，动态获取模型
  stream(messages: ChatMessage[], model: string, apiKey: string, callbacks: StreamCallbacks, systemPrompt?: string): () => void
}
```

- `authType` 可选，默认视为 `'apikey'`，不影响现有 provider
- `fetchModels` 可选，Copilot 用它动态拉取模型列表

### 2. 新建 Copilot 认证模块

**新建 `electron/copilot-auth.ts`** — 纯逻辑，用 Node.js 内置 `fetch`，不依赖 Electron API。

**Device Flow（client_id: `Iv1.b507a08c87ecfe98`）：**

- `requestDeviceCode()` → POST `https://github.com/login/device/code` → 返回 `{ device_code, user_code, verification_uri, interval }`
- `pollForToken(deviceCode)` → POST `https://github.com/login/oauth/access_token` → 返回 `{ status: 'pending' | 'expired' | 'token' }`

**Copilot Token 交换：**

- `getCopilotToken(githubToken)` → GET `https://api.github.com/copilot_internal/v2/token` → 返回短期 Copilot API token
- 内存缓存 + 5 分钟提前刷新 + Promise 锁防并发

### 3. 新建 Copilot Provider

**新建 `electron/providers/copilot.ts`** — 复用 OpenAI SDK，`baseURL` 设为 `https://api.githubcopilot.com`。

- `authType: 'oauth'`，`models: []`（动态获取）
- `validateKey(githubToken)` — 调用 `getCopilotToken()` 验证链路
- `fetchModels(githubToken)` — 换取 Copilot token 后调 `/models` 接口
- `stream()` — `apiKey` 参数实际是 GitHub OAuth token，内部换取 Copilot token 后调用 OpenAI SDK

**`electron/providers/index.ts`** — 注册 `copilot: copilotProvider`。

### 4. IPC + Preload

**`electron/main.ts`** — 新增 3 个 handler：

- `copilot:start-auth` — 调用 `requestDeviceCode()` + `shell.openExternal()` 打开浏览器
- `copilot:poll-auth` — 调用 `pollForToken()`，成功后 `setApiKey('copilot', token)` 加密存储
- `copilot:fetch-models` — 读取存储的 GitHub token，调用 `provider.fetchModels()`

修改 `settings:get-providers` — 返回值增加 `authType` 字段。

**`electron/preload.ts`** — 新增 `window.copilot` bridge：

```typescript
contextBridge.exposeInMainWorld('copilot', {
  startAuth: () => ipcRenderer.invoke('copilot:start-auth'),
  pollAuth: (deviceCode: string) => ipcRenderer.invoke('copilot:poll-auth', { deviceCode }),
  fetchModels: () => ipcRenderer.invoke('copilot:fetch-models'),
})
```

### 5. 前端类型

**`src/types.ts`**：

- `ProviderInfo` 新增 `authType: 'apikey' | 'oauth'`
- `Window` 新增 `copilot` 声明

### 6. Settings UI

**`src/components/SettingsModal.tsx`** — 根据 `authType` 条件渲染：

**OAuth 模式（Copilot）：**
- `idle` 状态 → "Sign in with GitHub" 按钮
- `pending` 状态 → 显示 `user_code`（大号等宽字体），提示 "Waiting for authorization..."
- `signed-in` 状态 → 绿色 "Signed in" 标记 + "Re-authenticate" 按钮

**Model 下拉框：** OAuth provider 使用动态获取的模型列表。

**轮询管理：** 用 `useRef` 存 interval，组件卸载时清理。

## 涉及文件

| 文件 | 操作 |
|------|------|
| `electron/providers/types.ts` | **修改** — 新增 `authType`, `fetchModels` |
| `electron/copilot-auth.ts` | **新建** — Device Flow + Token 交换 |
| `electron/providers/copilot.ts` | **新建** — Copilot provider |
| `electron/providers/index.ts` | **修改** — 注册 copilot |
| `electron/main.ts` | **修改** — 3 个新 IPC handler + 修改 get-providers |
| `electron/preload.ts` | **修改** — 暴露 `window.copilot` |
| `src/types.ts` | **修改** — ProviderInfo + Window.copilot |
| `src/components/SettingsModal.tsx` | **修改** — OAuth 认证 UI + 动态模型 |

## 边缘情况

- **Token 过期**：`getCopilotToken` 内存缓存 + 5 分钟提前刷新
- **并发刷新**：Promise 锁避免多次请求
- **Device code 过期**：轮询收到 `expired` → UI 回到 idle，提示重试
- **无 Copilot 订阅**：`getCopilotToken` 返回 403 → 显示明确错误
- **关闭弹窗**：`useEffect` cleanup 清除轮询 interval

## 验证

1. Settings 选择 GitHub Copilot，点击 "Sign in with GitHub"
2. 浏览器打开 GitHub 授权页，输入 user_code
3. 授权后 UI 自动变为 "Signed in"，模型列表动态加载
4. 选择模型发送消息，确认流式回复正常
5. 重启应用，确认认证状态保留
6. `npx tsc --noEmit` 零错误
