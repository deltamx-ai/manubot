2026-03-13 23:58:31

# Summary: 添加窗口控制按钮（最小化、最大化、关闭）

## 变更内容

1. **`electron/main.ts`** — 添加 `ipcMain` 导入，注册三个 IPC 事件监听器：
   - `window-minimize`：调用 `win?.minimize()`
   - `window-maximize`：切换最大化/还原（`win?.isMaximized()` 判断）
   - `window-close`：调用 `win?.close()`

2. **`electron/preload.ts`** — 通过 `contextBridge.exposeInMainWorld` 暴露 `windowControls` 对象，包含 `minimize()`、`maximize()`、`close()` 三个方法，内部通过 `ipcRenderer.send()` 发送对应事件。

3. **`electron/electron-env.d.ts`** — 在 `Window` 接口中添加 `windowControls` 类型定义。

4. **`src/App.tsx`** — 在主聊天区域顶部添加可拖动标题栏（`-webkit-app-region: drag`），右侧放置三个窗口控制按钮（`no-drag`）：
   - 最小化（`─`）、最大化（`□`）：hover 灰色背景
   - 关闭（`✕`）：hover 红色背景 + 白色文字

## 验证结果
- `npm run lint` — 通过
- `npm run build` — 通过
