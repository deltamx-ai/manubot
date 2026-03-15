# better-sqlite3 在 Electron 中的两个报错及解决

## 报错一：`__filename is not defined`

### 错误信息

```
(node:952003) UnhandledPromiseRejectionWarning: ReferenceError: __filename is not defined
```

### 原因

`vite-plugin-electron` 将 `electron/main.ts` 打包时，默认会把 `better-sqlite3` 的代码 bundle 进 `dist-electron/main.js`。`better-sqlite3` 是原生模块（包含 `.node` 二进制文件），它内部通过 `__filename` 定位原生文件路径。但 Vite 打包后输出的是 ESM 格式，ESM 中没有 `__filename` 这个变量，所以报错。

### 解决

在 `vite.config.ts` 中将 `better-sqlite3` 设为 external，不让 Vite 打包它，运行时直接从 `node_modules` 加载：

```ts
electron({
  main: {
    entry: 'electron/main.ts',
    vite: {
      build: {
        rollupOptions: {
          external: ['better-sqlite3'],
        },
      },
    },
  },
  // ...
})
```

打包后 `main.js` 中对 `better-sqlite3` 的引用变成了 `require('better-sqlite3')`，由 Node.js 运行时解析，不再需要 `__filename`。

验证方式：`main.js` 文件大小从 ~25KB 降到 ~3.4KB，说明原生模块代码不再被内联。

---

## 报错二：`NODE_MODULE_VERSION` 不匹配

### 错误信息

```
Error: The module '.../better_sqlite3.node'
was compiled against a different Node.js version using
NODE_MODULE_VERSION 137. This version of Node.js requires
NODE_MODULE_VERSION 123.
```

### 原因

`npm install` 安装 `better-sqlite3` 时，prebuild 下载的（或本地编译的）原生二进制文件是针对系统安装的 Node.js 版本编译的（NODE_MODULE_VERSION 137）。但 Electron 内置了自己的 Node.js 版本（NODE_MODULE_VERSION 123），两者 ABI 不兼容，无法加载。

### 解决

用 `electron-rebuild` 针对当前 Electron 版本重新编译原生模块：

```bash
npx electron-rebuild -f -w better-sqlite3
```

- `-f`：强制重新编译
- `-w better-sqlite3`：只编译 `better-sqlite3` 这一个模块

执行后 `node_modules/better-sqlite3/build/Release/better_sqlite3.node` 会被替换为适配 Electron Node.js 版本的二进制文件。

### 注意事项

- 每次 `npm install` 或更新 `better-sqlite3` / `electron` 版本后，都需要重新执行 `npx electron-rebuild -f -w better-sqlite3`
- 可以在 `package.json` 中添加 postinstall 脚本自动化：

```json
{
  "scripts": {
    "postinstall": "electron-rebuild -f -w better-sqlite3"
  }
}
```
