2026-03-13 23:58:31

# Plan: 添加窗口控制按钮（最小化、最大化、关闭）

## Context
当前应用 `frame: false` 移除了系统窗口边框，没有最小化/最大化/关闭按钮。需要在主聊天区域右上角添加自定义窗口控制按钮。

## 修改文件

### 1. `electron/main.ts` — 添加 IPC 事件监听
- 引入 `ipcMain`
- 添加三个 IPC handler：`window-minimize`、`window-maximize`、`window-close`
- 使用 `win?.minimize()`、`win?.maximize()`/`win?.unmaximize()`、`win?.close()`

### 2. `electron/preload.ts` — 暴露窗口控制 API
- 在 `contextBridge.exposeInMainWorld` 中新增 `windowControls` 对象，包含：
  - `minimize()` → `ipcRenderer.send('window-minimize')`
  - `maximize()` → `ipcRenderer.send('window-maximize')`
  - `close()` → `ipcRenderer.send('window-close')`

### 3. `electron/electron-env.d.ts` — 更新类型定义
- 在 `Window` 接口中添加 `windowControls` 类型

### 4. `src/App.tsx` — 添加 UI
- 在主聊天区域顶部添加一个标题栏 `div`：
  - 设置 `-webkit-app-region: drag` 使其可拖动窗口
  - 右侧放置三个按钮（最小化 `─`、最大化 `□`、关闭 `✕`），按钮设置 `-webkit-app-region: no-drag`
  - 关闭按钮 hover 为红色，其他按钮 hover 为灰色
- 按钮调用 `window.windowControls.minimize()` 等方法

## 验证
- `npm run lint` 通过
- `npm run build` 通过
- `npm run dev` 运行后窗口右上角显示三个按钮，点击功能正常
