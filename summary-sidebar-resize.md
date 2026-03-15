2026-03-15

# Summary: 侧边栏可拖拽调整宽度

## 变更内容

1. **`src/App.tsx`** — 添加侧边栏拖拽调整宽度功能：
   - 新增 `sidebarWidth` state（默认 260px）和 `isResizing` ref
   - `useEffect` 注册全局 `mousemove`/`mouseup` 监听：拖拽时根据鼠标 X 坐标更新宽度（clamp 200~480px），松开鼠标结束拖拽并恢复 cursor/userSelect
   - 侧边栏 `width` 从固定 260 改为动态 `sidebarWidth`
   - 移除侧边栏 `border-r border-gray-200`
   - 新增分割条 `div`（`w-1 cursor-col-resize`），hover 蓝色高亮，`onMouseDown` 启动拖拽模式

## 实现要点
- 使用 `useRef` 而非 state 存储 `isResizing`，避免拖拽过程中不必要的重渲染
- 全局监听 `mousemove`/`mouseup`（而非分割条上），确保鼠标移出分割条后拖拽仍然生效
- 拖拽时设置 `document.body.style.userSelect = 'none'` 防止意外选中文本
- 拖拽时设置 `document.body.style.cursor = 'col-resize'` 保持光标一致

## 验证结果
- `npm run lint` — 通过
- `npm run build` — 通过
