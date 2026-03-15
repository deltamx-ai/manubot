# 聊天记录本地持久化方案设计

## 现状

- `ChatSession` 和 `Message` 数据仅存在于 React state 中，刷新/关闭即丢失
- 项目是 Electron 应用，有完整的 main/preload/renderer 三层架构
- preload 已暴露 `ipcRenderer.invoke`，可以方便地做 main ↔ renderer 通信
- 目前没有任何存储相关依赖

## 方案对比

### 方案一：localStorage（纯前端）

**原理：** 直接在 renderer 进程用 `localStorage.setItem/getItem` 读写 JSON。

**优点：**
- 零依赖，不需要改 main 进程和 preload
- 实现最简单，10 行代码搞定
- 同步 API，不需要 async/await

**缺点：**
- 容量限制 ~5MB（大量聊天记录可能不够）
- 数据存在 Chromium 的 LevelDB 里，用户不可见、不可手动备份
- 多窗口场景下可能有竞争问题
- Electron 清除缓存会丢数据

**适合场景：** 数据量小、快速原型

---

### 方案二：electron-store / JSON 文件（主进程文件读写）

**原理：** 在 main 进程用 Node.js `fs` 模块读写 JSON 文件，通过 IPC 暴露给 renderer。

**优点：**
- 数据存为可见的 JSON 文件（如 `~/.config/manubot/sessions.json`），用户可手动备份
- 无容量限制（受磁盘空间限制）
- 可以用 `electron-store` 库简化（自带 schema 校验、原子写入、迁移）
- 也可以不引入依赖，直接用 `fs.readFileSync` / `fs.writeFileSync`

**缺点：**
- 需要在 main 进程注册 IPC handler
- 需要在 preload 暴露对应方法
- 大文件整体读写性能一般（但聊天记录通常不大）
- 没有查询能力，只能全量读写

**适合场景：** 中等数据量、需要用户可见的持久化

---

### 方案三：SQLite（better-sqlite3）

**原理：** 在 main 进程用 `better-sqlite3` 操作本地 SQLite 数据库。

**优点：**
- 真正的数据库，支持索引、查询、分页
- 性能好，适合大量数据
- 单文件存储，便于备份和迁移
- 数据完整性有保障（ACID）

**缺点：**
- 需要安装原生模块 `better-sqlite3`，Electron 打包时需要 rebuild
- 实现复杂度最高（建表、SQL 语句、序列化/反序列化）
- 对当前项目规模来说过度设计

**适合场景：** 大量数据、需要复杂查询

---

### 方案四：IndexedDB（纯前端）

**原理：** 用浏览器内置的 IndexedDB API 存储结构化数据。

**优点：**
- 容量大（通常 50MB+，远超 localStorage）
- 支持索引和简单查询
- 无需额外依赖
- 异步 API，不阻塞 UI

**缺点：**
- API 繁琐（可以用 `idb` 库简化）
- 数据同样存在 Chromium 内部，用户不可见
- 清除缓存会丢数据

**适合场景：** 中等数据量、不需要用户可见文件

---

## 推荐

| 维度 | localStorage | JSON 文件 | SQLite | IndexedDB |
|------|-------------|-----------|--------|-----------|
| 实现难度 | 最低 | 低 | 高 | 中 |
| 新增依赖 | 无 | 可选 electron-store | better-sqlite3 | 可选 idb |
| 容量 | ~5MB | 无限 | 无限 | ~50MB+ |
| 用户可见 | 否 | 是 | 是 | 否 |
| 查询能力 | 无 | 无 | 强 | 弱 |
| 打包复杂度 | 无 | 无 | 需 rebuild | 无 |

**建议采用方案二（JSON 文件）：**

1. 实现简单，不需要额外依赖（直接用 Node.js `fs`）
2. 数据文件用户可见可备份
3. 聊天记录数据量不大，JSON 全量读写完全够用
4. 后续如果数据量增长，可以平滑迁移到 SQLite

## 实现步骤（方案二）

### 1. main 进程：注册 IPC handler

在 `electron/main.ts` 中：
- `sessions:load` — 读取 JSON 文件，返回 `ChatSession[]`
- `sessions:save` — 接收 `ChatSession[]`，写入 JSON 文件
- 存储路径：`app.getPath('userData') + '/sessions.json'`

### 2. preload：暴露存储 API

在 `electron/preload.ts` 中暴露：
```ts
storage: {
  loadSessions: () => ipcRenderer.invoke('sessions:load'),
  saveSessions: (sessions) => ipcRenderer.invoke('sessions:save', sessions),
}
```

### 3. renderer：App.tsx 集成

- 启动时调用 `window.storage.loadSessions()` 加载数据
- `sessions` state 变化时调用 `window.storage.saveSessions(sessions)` 保存
- 用 `useEffect` 监听 sessions 变化自动保存（加 debounce 避免频繁写入）

### 涉及文件

| 文件 | 改动 |
|------|------|
| `electron/main.ts` | 新增 `sessions:load` / `sessions:save` IPC handler |
| `electron/preload.ts` | 暴露 `storage` API |
| `src/App.tsx` | 启动加载 + 变化时保存 |
| `src/types.ts` | 可能需要新增 `window.storage` 类型声明 |
