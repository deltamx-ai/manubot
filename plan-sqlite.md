# SQLite 持久化实现计划

## 目标

用 SQLite 持久化聊天记录，为后续集成 LLM 做好数据层准备。

## 技术选型

- `better-sqlite3`：同步 API，Electron main 进程中使用，性能好
- `electron-rebuild`：确保原生模块在 Electron 中正确编译

## 数据库设计

```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  content TEXT NOT NULL,
  sender TEXT NOT NULL CHECK(sender IN ('user', 'bot')),
  timestamp TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE INDEX idx_messages_session_id ON messages(session_id);
```

存储路径：`app.getPath('userData') + '/manubot.db'`

## IPC 接口设计

| Channel | 方向 | 参数 | 返回 | 说明 |
|---------|------|------|------|------|
| `db:sessions:list` | renderer → main | 无 | `ChatSession[]` | 加载所有会话（含消息） |
| `db:sessions:create` | renderer → main | `{id, title}` | `void` | 创建会话 |
| `db:sessions:delete` | renderer → main | `{id}` | `void` | 删除会话（级联删消息） |
| `db:messages:create` | renderer → main | `{message, sessionId}` | `void` | 新增消息 |

## 涉及文件与改动

### 1. 安装依赖

```bash
npm install better-sqlite3
npm install -D @types/better-sqlite3 electron-rebuild
```

### 2. `electron/database.ts`（新建）

封装 SQLite 操作：
- `initDatabase()`：创建/打开数据库，建表
- `getSessions()`：查询所有会话 + 消息
- `createSession(id, title)`：插入会话
- `deleteSession(id)`：删除会话
- `createMessage(sessionId, message)`：插入消息

### 3. `electron/main.ts`

- 导入 database 模块
- `app.whenReady()` 时调用 `initDatabase()`
- 注册 4 个 `ipcMain.handle` 处理器

### 4. `electron/preload.ts`

暴露 `storage` API：
```ts
contextBridge.exposeInMainWorld('storage', {
  loadSessions: () => ipcRenderer.invoke('db:sessions:list'),
  createSession: (id, title) => ipcRenderer.invoke('db:sessions:create', { id, title }),
  deleteSession: (id) => ipcRenderer.invoke('db:sessions:delete', { id }),
  createMessage: (sessionId, message) => ipcRenderer.invoke('db:messages:create', { sessionId, message }),
})
```

### 5. `src/types.ts`

新增 `window.storage` 类型声明。

### 6. `src/App.tsx`

- 启动时 `useEffect` 调用 `window.storage.loadSessions()` 加载数据
- `handleNewChat` 时调用 `window.storage.createSession()`
- `handleDeleteSession` 时调用 `window.storage.deleteSession()`
- `handleSendMessage` 时调用 `window.storage.createMessage()`
- 去掉模拟 bot 回复（后续由 LLM 替代）

## 文件清单

| 文件 | 操作 |
|------|------|
| `electron/database.ts` | 新建 |
| `electron/main.ts` | 修改 |
| `electron/preload.ts` | 修改 |
| `src/types.ts` | 修改 |
| `src/App.tsx` | 修改 |
