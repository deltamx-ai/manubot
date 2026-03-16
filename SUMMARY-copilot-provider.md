# Summary: GitHub Copilot Provider 实现

## 变更概览

为 Manubot 添加 GitHub Copilot 作为 LLM Provider，通过 OAuth Device Flow 认证，复用 OpenAI SDK 调用 Copilot API。

## 变更文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `electron/providers/types.ts` | 修改 | `LLMProvider` 新增 `authType?` 和 `fetchModels?` 可选字段 |
| `electron/copilot-auth.ts` | **新建** | GitHub OAuth Device Flow + Copilot Token 交换（内存缓存 + Promise 锁） |
| `electron/providers/copilot.ts` | **新建** | Copilot Provider，复用 OpenAI SDK，baseURL `api.githubcopilot.com` |
| `electron/providers/index.ts` | 修改 | 注册 `copilot` provider |
| `electron/main.ts` | 修改 | 新增 `copilot:start-auth` / `copilot:poll-auth` / `copilot:fetch-models` IPC handler；`get-providers` 返回 `authType` |
| `electron/preload.ts` | 修改 | 暴露 `window.copilot` bridge（startAuth / pollAuth / fetchModels） |
| `src/types.ts` | 修改 | `ProviderInfo` 新增 `authType`；`Window` 新增 `copilot` 类型声明 |
| `src/components/SettingsModal.tsx` | 修改 | 根据 `authType` 条件渲染：API Key 输入 vs OAuth 三态 UI（idle / pending / signed-in）；动态模型列表 |

## 关键设计决策

1. **认证模块独立** — `copilot-auth.ts` 纯 Node.js 逻辑，不依赖 Electron API，方便测试
2. **Token 缓存** — Copilot token 短期有效，内存缓存 + 5 分钟提前刷新 + Promise 锁防并发
3. **向后兼容** — `authType` 和 `fetchModels` 均为可选字段，现有 OpenAI/Anthropic provider 无需修改
4. **动态模型** — Copilot `models: []`，登录后通过 `/models` 接口动态获取支持 chat 的模型列表
5. **轮询机制** — 使用递归 `setTimeout` + `cancelledRef` guard 替代 `setInterval`，避免 async 回调并发重叠和组件卸载后的状态更新

## 验证状态

- `npx tsc --noEmit` 零错误
