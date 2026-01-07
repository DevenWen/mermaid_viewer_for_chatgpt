# Mermaid Viewer for ChatGPT - 项目上下文

## 项目概述

这是一个基于 Chrome 扩展的项目，允许用户直接在 ChatGPT 聊天界面中渲染 Mermaid 图表。该扩展使用 React + Vite 构建，采用 Manifest V3 规范。

### 主要技术栈

- **前端框架**: React 18.2.0
- **构建工具**: Vite 5.4.10
- **语言**: TypeScript 5.2.2
- **图表库**: Mermaid 11.10.1
- **Chrome 扩展框架**: @crxjs/vite-plugin 2.0.0-beta.26

### 核心功能

1. **内容脚本 (Content Script)**: 在网页中检测 Mermaid 代码块（`code.language-mermaid`），并自动添加渲染按钮
2. **动态图表渲染**: 用户点击渲染按钮后，在页面中实时生成对应的 Mermaid 图表
3. **深色模式支持**: 自动检测页面是否处于深色模式，并相应调整图表主题
4. **多页面支持**: 包含 popup、options、devtools、sidepanel 和 newtab 页面

### 项目结构

```
src/
├── manifest.ts          # Chrome 扩展清单文件
├── background/          # 后台服务脚本
│   └── index.ts
├── contentScript/       # 内容脚本（核心功能）
│   ├── index.ts         # Mermaid 检测和渲染逻辑
│   ├── mermaid-viewer.css  # 样式文件
│   └── types.ts
├── popup/               # 弹出页面
│   ├── Popup.tsx
│   └── index.tsx
├── options/             # 选项页面
├── devtools/            # 开发者工具页面
├── sidepanel/           # 侧边栏页面
└── newtab/              # 新标签页
```

## 构建和运行

### 环境要求

- Node.js >= 14.18.0

### 开发模式

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

开发服务器会在 `http://0.0.0.0:3000/` 启动，可以调试各个页面：
- Popup 页面: `http://0.0.0.0:3000/popup.html`
- Options 页面: `http://0.0.0.0:3000/options.html`

### Chrome 扩展开发者模式

1. 在 Chrome 浏览器中启用"开发者模式"
2. 点击"加载已解压的扩展程序"
3. 选择项目根目录下的 `build` 文件夹

### 生产构建

```bash
# 构建扩展
npm run build

# 打包扩展为 ZIP 文件
npm run zip
```

构建产物位于 `build/` 目录，可以直接提交到 Chrome Web Store。

### 其他命令

```bash
# 格式化代码
npm run fmt

# 预览构建结果
npm run preview
```

## 开发规范

### 代码风格

项目使用 Prettier 进行代码格式化，配置如下（`.prettierrc`）：

```json
{
  "jsxSingleQuote": false,
  "singleQuote": true,
  "trailingComma": "all",
  "endOfLine": "lf",
  "printWidth": 100,
  "semi": false,
  "tabWidth": 2,
  "useTabs": false
}
```

### TypeScript 配置

- 目标: ESNext
- 模块系统: ESNext
- JSX: react-jsx
- 严格模式: 关闭（`strict: false`）
- 包括: `src` 目录
- 排除: `src/manifest.ts`

### 文件命名约定

- React 组件使用 PascalCase（如 `Popup.tsx`）
- 工具函数和逻辑文件使用 camelCase（如 `index.ts`）
- 样式文件使用 kebab-case（如 `mermaid-viewer.css`）

### 核心功能实现细节

#### Content Script 工作流程

1. **初始化**: 页面加载时初始化 Mermaid 库
2. **检测元素**: 查找所有 `code.language-mermaid` 元素
3. **创建渲染按钮**: 为每个 Mermaid 代码块添加渲染按钮
4. **动态监听**: 使用 MutationObserver 监听 DOM 变化，处理动态加载的内容
5. **渲染图表**: 用户点击按钮时，调用 Mermaid API 渲染图表

#### 深色模式检测

扩展通过多种方式检测深色模式：
- 检查 `body` 或 `html` 元素的 `dark` 类
- 分析背景色亮度
- 检查 `prefers-color-scheme` 媒体查询

#### 权限配置

扩展需要以下权限（在 `manifest.ts` 中定义）：
- `sidePanel`: 侧边栏功能
- `storage`: 存储用户设置

### 扩展页面

- **Popup**: 点击扩展图标时显示的弹出页面，包含计数器示例
- **Options**: 扩展选项页面
- **DevTools**: 开发者工具页面
- **SidePanel**: 侧边栏页面
- **NewTab**: 新标签页覆盖

### 注意事项

1. **Mermaid 配置**: 使用 `startOnLoad: false` 和 `securityLevel: 'loose'` 配置
2. **主题适配**: 根据深色模式动态切换 Mermaid 主题（`dark` 或 `default`）
3. **SVG 响应式**: 渲染的 SVG 图表设置为 `maxWidth: 100%` 以适应不同屏幕
4. **错误处理**: 捕获并显示 Mermaid 渲染错误，提供用户友好的错误信息

### Git 仓库信息

- 远程仓库: `git@github.com:DevenWen/mermaid_viewer_for_chatgpt.git`
- 当前分支: Clean working directory
- HEAD SHA: c7b13c82f6e09170bddeb486c7348954c8557392

### 相关资源

- 项目基于 [create-chrome-ext](https://github.com/guocaoyi/create-chrome-ext) 生成
- Chrome Web Store 发布指南: https://developer.chrome.com/webstore/publish