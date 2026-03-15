# 可拖拽双栏布局实现计划

## 目标

页面分为左右两栏：
- **左栏**：白色背景（`bg-white`），可放置侧边栏内容
- **右栏**：浅灰色背景（`bg-gray-50`），主内容区域
- 左栏宽度有最小值和最大值约束
- 两栏之间有一条可拖拽的分隔线，鼠标拖动可调整左栏宽度

## 实现方案

### 核心思路

在 `App.tsx` 中用 `mousedown` / `mousemove` / `mouseup` 事件实现拖拽逻辑，左栏宽度由 state 控制，用 inline style 设置 `width`。不引入第三方库，纯 React + 原生事件实现。

### 涉及文件与改动

#### 1. `src/App.tsx` — 主布局 + 拖拽逻辑

**新增状态：**
- `sidebarWidth: number`（初始值 260px）

**新增 ref：**
- `isResizing: useRef<boolean>` — 标记是否正在拖拽

**拖拽逻辑：**
- 分隔线上 `onMouseDown` → 设 `isResizing = true`
- `useEffect` 中注册 `document` 级别的 `mousemove` 和 `mouseup`：
  - `mousemove`：如果 `isResizing`，计算 `e.clientX`，clamp 到 `[MIN_WIDTH, MAX_WIDTH]`，更新 `sidebarWidth`
  - `mouseup`：设 `isResizing = false`
- 拖拽时给 body 加 `cursor: col-resize` + `user-select: none`，松开时移除

**宽度约束常量：**
```ts
const MIN_SIDEBAR_WIDTH = 200  // 最小 200px
const MAX_SIDEBAR_WIDTH = 480  // 最大 480px
```

**布局结构（JSX）：**
```tsx
<div className="flex h-screen">
  {/* 左栏 */}
  <div
    className="flex flex-col bg-white"
    style={{ width: sidebarWidth, minWidth: MIN_SIDEBAR_WIDTH, maxWidth: MAX_SIDEBAR_WIDTH }}
  >
    <Sidebar ... />
  </div>

  {/* 拖拽分隔线 */}
  <div
    className="w-1 cursor-col-resize bg-gray-200 hover:bg-blue-400 transition-colors flex-shrink-0"
    onMouseDown={handleMouseDown}
  />

  {/* 右栏 */}
  <div className="flex-1 flex flex-col bg-gray-50">
    <TitleBar />
    <ChatArea ... />
    <InputArea ... />
  </div>
</div>
```

#### 2. `src/components/Sidebar.tsx` — 移除自身宽度控制

**改动：**
- 移除 `w-56 min-w-56`（宽度现在由父容器通过 inline style 控制）
- 背景色 `bg-gray-800` → 移除（继承父容器的 `bg-white`）
- 文字颜色 `text-white` → `text-gray-800`（深色文字适配白色背景）
- 按钮、边框等颜色从深色主题调整为浅色主题

根容器改为：
```tsx
<div className="flex flex-col h-full">
```

## 不涉及的文件

`ChatArea.tsx`、`MessageBubble.tsx`、`InputArea.tsx`、`TitleBar.tsx` 本次不改动，专注于拖拽双栏功能。

## 验证

1. `npm run build` 编译通过
2. 左栏白色，右栏浅灰
3. 鼠标悬停分隔线显示 `col-resize` 光标
4. 拖拽分隔线可调整左栏宽度
5. 宽度不会超出 200px ~ 480px 范围
6. 拖拽过程中不会选中页面文字
