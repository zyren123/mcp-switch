# Changelog

## [Unreleased]

### Phase 1: 项目初始化 - ✅ 已完成

**完成时间**: 2026-01-11

**创建的文件**:
- `package.json` - 项目配置，包含所有依赖
- `electron.vite.config.ts` - Electron Vite 构建配置
- `tsconfig.json` / `tsconfig.node.json` / `tsconfig.web.json` - TypeScript 配置
- `tailwind.config.js` - Tailwind CSS 配置
- `postcss.config.js` - PostCSS 配置
- `vitest.config.ts` / `vitest.integration.config.ts` - Vitest 测试配置
- `playwright.config.ts` - Playwright E2E 测试配置
- `src/main/index.ts` - Electron 主进程入口
- `src/preload/index.ts` - 预加载脚本
- `src/preload/index.d.ts` - 预加载类型声明
- `src/renderer/index.html` - HTML 入口
- `src/renderer/main.tsx` - React 入口
- `src/renderer/App.tsx` - React 根组件
- `src/renderer/styles/globals.css` - 全局样式 + Tailwind

**安装的依赖**:
- Electron 28 + electron-vite
- React 18 + TypeScript
- Tailwind CSS + PostCSS + Autoprefixer
- Zustand (状态管理)
- @iarna/toml (TOML 解析)
- jsonc-parser (JSONC 解析)
- Vitest + Playwright (测试框架)

**测试结果**:
- ✅ `npm run build` - 构建成功
- ✅ `npm run dev` - 开发模式启动成功，应用正常运行

### Phase 2: 核心数据模型与共享类型 - ✅ 已完成

**完成时间**: 2026-01-11

**创建的文件**:
- `src/shared/types.ts` - 共享类型定义
  - `IDEType` - 6种 IDE 类型定义
  - `MCPServer` - MCP 服务器配置接口
  - `MCPServerConfig` - 服务器配置结构
  - `IDEConfig` - IDE 配置接口
  - `SyncConflict` - 同步冲突类型
  - `FieldValue` - 字段值类型
  - `SyncOperation` - 同步操作接口
  - `BackupInfo` - 备份信息接口
  - `IPC_CHANNELS` - IPC 通道常量定义
  - `IPCChannel` - IPC 通道类型
- `src/renderer/types/mcp.ts` - 渲染进程专用类型
  - 重新导出所有共享类型
  - `IDECardState` - IDE 卡片 UI 状态
  - `ServerToggleState` - 服务器开关状态
  - `SyncPreviewItem` - 同步预览项
  - `SyncPanelState` - 同步面板状态
  - `ConflictResolution` - 冲突解决选择
  - `ToastNotification` - 通知类型
  - `AppUIState` - 应用 UI 状态

**测试结果**:
- ✅ `npm run typecheck` - TypeScript 类型检查通过

### Phase 3: 工具函数与配置适配器 - ✅ 已完成

**完成时间**: 2026-01-11

**创建的工具函数** (`src/main/utils/`):
- `platform.ts` - 跨平台路径解析
  - `getConfigPath()` - 获取各 IDE 配置文件路径
  - `getIDEDisplayName()` - 获取 IDE 显示名称
  - `getConfigFormat()` - 获取配置文件格式
  - `getAllIDETypes()` - 获取所有支持的 IDE 类型
- `configParser.ts` - 配置解析器
  - `getParser()` / `getFormatter()` - 根据 IDE 类型获取解析/格式化函数
  - `parseJSONC()` / `formatJSONC()` - JSONC 解析与格式化
  - `deepMerge()` - 深度合并配置对象
- `envExpander.ts` - 环境变量扩展
  - `expandEnvVars()` - 展开 `${VAR}`, `${env:VAR}`, `{env:VAR}` 语法
  - `hasEnvVarSyntax()` - 检测是否包含环境变量语法
  - `hasDefaultValue()` - 检测是否包含默认值语法
- `errors.ts` - 错误处理
  - `ConfigErrorCode` - 错误码枚举 (成功/文件/解析/同步/配置/系统)
  - `ConfigError` - 自定义错误类型
  - `createConfigError()` - 错误工厂函数
  - `isConfigError()` - 类型守卫
  - `getErrorMessage()` - 获取用户友好错误信息
- `sanitizer.ts` - 敏感信息处理
  - `sanitizeConfig()` - 遮蔽敏感字段
  - `containsSensitiveInfo()` - 检测敏感信息
  - `redactString()` - 部分遮蔽字符串
  - `isSensitiveKey()` - 判断是否为敏感键名

**创建的适配器** (`src/main/adapters/`):
- `BaseAdapter.ts` - 抽象基类
  - `readConfig()` / `writeConfig()` - 读写配置
  - `normalizeServers()` / `denormalizeServers()` - 服务器配置标准化
  - `checkInstalled()` / `configExists()` - 检测安装状态
  - `readRawContent()` / `writeRawContent()` - 原始内容读写
- `ClaudeDesktopAdapter.ts` - Claude Desktop 适配器
- `ClaudeCodeAdapter.ts` - Claude Code CLI 适配器
- `CursorAdapter.ts` - Cursor IDE 适配器
- `WindsurfAdapter.ts` - Windsurf IDE 适配器
- `CodexAdapter.ts` - Codex CLI 适配器 (TOML 格式)
- `OpenCodeAdapter.ts` - OpenCode 适配器 (JSONC 格式)
- `index.ts` - 适配器注册表

**创建的测试文件** (`tests/unit/`):
- `utils/platform.test.ts` - 17 个测试
- `utils/configParser.test.ts` - 29 个测试
- `utils/envExpander.test.ts` - 33 个测试
- `utils/errors.test.ts` - 21 个测试
- `utils/sanitizer.test.ts` - 29 个测试
- `adapters/BaseAdapter.test.ts` - 23 个测试
- `adapters/ClaudeDesktopAdapter.test.ts` - 9 个测试
- `adapters/ClaudeCodeAdapter.test.ts` - 6 个测试
- `adapters/CursorAdapter.test.ts` - 4 个测试
- `adapters/WindsurfAdapter.test.ts` - 5 个测试
- `adapters/CodexAdapter.test.ts` - 9 个测试
- `adapters/OpenCodeAdapter.test.ts` - 7 个测试

**测试结果**:
- ✅ `npm run test:unit` - 12 个测试文件，192 个测试用例全部通过
- ✅ 总体覆盖率 90.97%（超过 90% 目标）
  - utils: 100% 语句覆盖率
  - adapters: 78.91% 语句覆盖率（BaseAdapter 和 index.ts 部分分支未覆盖）

**修复项**:
- 修复 `BaseAdapter.test.ts` 中 TestAdapter 类定义时机问题（需在 beforeEach 中动态创建）
