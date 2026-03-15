# Tailwind CSS 不生效问题排查记录

## 现象

所有 Tailwind 工具类（`flex`、`h-screen`、`bg-white`、`border-r` 等）均无效果，页面样式完全不受 class 控制。

## 根本原因

项目安装了 **Tailwind CSS v4**（`tailwindcss: ^4.2.1`），但没有正确配置 Vite 构建流程来处理它。

### 具体问题有两个：

### 1. 缺少 Vite 插件

`vite.config.ts` 中只配置了 `react()` 和 `electron()` 插件，**没有** Tailwind CSS 的处理插件。

Tailwind v4 需要通过 `@tailwindcss/vite` 插件集成到 Vite 构建中。没有这个插件，Vite 不知道如何处理 Tailwind 的指令和工具类——CSS 文件被原样输出，不做任何转换。

### 2. CSS 语法是 v3 的，v4 不认

`App.css` 中使用的是 Tailwind v3 语法：

```css
/* v3 语法 —— 在 v4 中无效 */
@tailwind base;
@tailwind components;
@tailwind utilities;

.markdown-content h1 {
  @apply font-bold text-2xl my-2;
}
```

Tailwind v4 的正确写法是：

```css
/* v4 语法 */
@import "tailwindcss";
```

同时 `@apply` 在 v4 中仍可用，但前提是 Tailwind 插件已正确加载。如果插件没加载，`@apply` 也会被原样输出到最终 CSS 中。

## 证据

构建后检查 `dist/assets/index-*.css`，发现内容如下：

```css
/* 这些指令被原样输出，说明没有任何工具处理它们 */
@tailwind base;
@tailwind components;
@tailwind utilities;

.markdown-content h1 {
  @apply font-bold text-2xl my-2;  /* 也是原样输出 */
}
```

CSS 文件大小只有 **2.24 KB**，仅包含 highlight.js 主题样式 + 未处理的 App.css + index.css 的 reset 样式。正常启用 Tailwind 后，CSS 文件大小为 **14.70 KB**（包含所有用到的工具类）。

## 修复方法

### 第一步：安装 Tailwind v4 的 Vite 插件

```bash
npm install @tailwindcss/vite
```

### 第二步：在 `vite.config.ts` 中注册插件

```ts
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),  // 必须加在这里
    react(),
    electron({ ... }),
  ],
})
```

### 第三步：将 CSS 从 v3 语法改为 v4 语法

```css
/* 之前（v3） */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* 之后（v4） */
@import "tailwindcss";
```

`@apply` 指令改为原生 CSS 以避免兼容问题。

## 总结

| 项目 | 修复前 | 修复后 |
|------|--------|--------|
| Vite 插件 | 无 Tailwind 插件 | `@tailwindcss/vite` |
| CSS 语法 | `@tailwind base/components/utilities`（v3） | `@import "tailwindcss"`（v4） |
| 构建 CSS 大小 | 2.24 KB（原样输出） | 14.70 KB（正常处理） |
| 工具类效果 | 全部无效 | 正常生效 |
