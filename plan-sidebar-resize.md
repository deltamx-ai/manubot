2026-03-15

# Plan: 侧边栏可拖拽调整宽度

## Context
当前侧边栏宽度固定为 260px，用户无法调整。需要在侧边栏和主聊天区域之间添加一个可拖拽的分割条，让用户通过鼠标拖拽自由调整侧边栏宽度（范围 200px ~ 480px）。

## 修改文件

### 1. `src/App.tsx` — 添加拖拽调整逻辑和分割条 UI

- 新增 `sidebarWidth` state（默认 260），控制侧边栏动态宽度
- 新增 `isResizing` ref，标记是否正在拖拽
- 添加 `useEffect` 注册全局 `mousemove` 和 `mouseup` 事件监听器：
  - `mousemove`：拖拽中时根据 `e.clientX` 更新 `sidebarWidth`，限制在 200~480 范围
  - `mouseup`：结束拖拽，重置 cursor 和 userSelect 样式
  - 返回清理函数移除事件监听器
- 侧边栏容器的 `width` 从固定值 `260` 改为动态 `sidebarWidth`
- 移除侧边栏的 `border-r border-gray-200`（分割条自带视觉分隔）
- 在侧边栏和主区域之间插入分割条 `div`：
  - 样式：`w-1 cursor-col-resize bg-gray-200 hover:bg-blue-400 active:bg-blue-500`
  - `onMouseDown`：设置 `isResizing.current = true`，设置 body cursor 为 `col-resize`，禁用文本选择

## 验证
- `npm run lint` 通过
- `npm run build` 通过
- `npm run dev` 运行后可拖拽分割条调整侧边栏宽度，范围 200~480px
