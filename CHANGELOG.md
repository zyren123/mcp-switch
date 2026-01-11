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

### Phase 4: 主进程服务 - ✅ 已完成

**完成时间**: 2026-01-11

**创建的服务** (`src/main/services/`):
- `ConfigService.ts` - 统一配置管理服务
  - `loadAllConfigs()` - 加载所有 IDE 配置
  - `loadConfig()` / `saveConfig()` - 单个 IDE 配置读写
  - `toggleServer()` - 切换服务器启用状态
  - `addServer()` / `removeServer()` / `updateServer()` - 服务器管理
  - `getServer()` / `getServers()` - 获取服务器信息
  - `getCachedConfig()` / `clearCache()` - 配置缓存管理
  - `isIDEInstalled()` / `getInstalledIDEs()` - IDE 安装状态检测
  - `createBackup()` / `restoreFromBackup()` - 备份操作
- `BackupService.ts` - 备份服务 (Phase 3 已创建，Phase 4 继续使用)
  - `createBackup()` / `restoreBackup()` - 备份创建与恢复
  - `listBackups()` / `getBackupInfo()` - 备份列表与详情
  - `deleteBackup()` / `deleteBackupsByType()` - 备份删除
  - `getBackupStats()` / `getBackupSize()` - 备份统计
- `ConfigWatcher.ts` - 文件监听服务 (Phase 3 已创建，Phase 4 继续使用)
  - `watchConfig()` / `unwatchConfig()` / `unwatchIDE()` - 监听管理
  - `refreshConfig()` - 刷新配置
  - `checkConfigIntegrity()` - 配置完整性检查
- `SyncConflictResolver.ts` - 同步冲突解决服务
  - `detectConflicts()` - 检测配置冲突
  - `previewSync()` - 预览同步操作
  - `executeSync()` - 执行同步（支持 overwrite/merge/keep-target/manual 策略）
  - `executeSyncToMultiple()` - 同步到多个目标

**创建的 IPC 通信层** (`src/main/ipc/`):
- `config.handlers.ts` - IPC 处理器
  - 配置操作: `CONFIG_LOAD_ALL`, `CONFIG_LOAD_ONE`, `CONFIG_SAVE`, `CONFIG_REFRESH`
  - 服务器操作: `SERVER_TOGGLE`, `SERVER_ADD`, `SERVER_REMOVE`, `SERVER_UPDATE`
  - 同步操作: `SYNC_PREVIEW`, `SYNC_EXECUTE`, `SYNC_RESOLVE_CONFLICT`
  - 备份操作: `BACKUP_CREATE`, `BACKUP_RESTORE`, `BACKUP_LIST`
  - `setupConfigWatchers()` - 设置配置文件监听
  - `removeConfigHandlers()` - 清理 IPC 处理器
- `index.ts` - IPC 初始化入口
  - `initializeIPC()` - 初始化所有 IPC 处理器和服务
  - `cleanupIPC()` - 清理 IPC 和监听器

**更新的文件**:
- `src/preload/index.ts` - 预加载脚本
  - 添加完整的 `electronAPI` 暴露给渲染进程
  - `config` - 配置操作 API
  - `server` - 服务器操作 API
  - `sync` - 同步操作 API
  - `backup` - 备份操作 API
  - `onConfigChanged()` / `onSyncStatusUpdate()` - 事件监听
- `src/preload/index.d.ts` - 预加载类型声明
  - `ConfigAPI`, `ServerAPI`, `SyncAPI`, `BackupAPI` 接口定义
- `src/main/index.ts` - 主进程入口
  - 集成 IPC 初始化
  - 添加应用退出时的清理逻辑

**创建的单元测试** (`tests/unit/services/`):
- `ConfigService.test.ts` - ConfigService 单元测试
- `BackupService.test.ts` - BackupService 单元测试
- `ConfigWatcher.test.ts` - ConfigWatcher 单元测试
- `SyncConflictResolver.test.ts` - SyncConflictResolver 单元测试

**创建的集成测试** (`tests/integration/`):
- `sync.test.ts` - 同步流程集成测试
  - 完整同步流程测试
  - 冲突检测与解决测试
  - 多目标同步测试
  - 服务器管理流程测试
  - 各种同步策略测试 (overwrite/keep-target/merge)
- `backup.test.ts` - 备份流程集成测试
  - 备份生命周期测试
  - 备份统计测试
  - 备份清理测试
- `ipc.test.ts` - IPC 通信集成测试
  - 所有 IPC 处理器测试
  - 错误处理测试
  - 清理流程测试

**Phase 4 实现的核心功能**:
1. **ConfigService** - 聚合所有适配器操作，提供统一的配置管理 API
2. **SyncConflictResolver** - 智能冲突检测，支持 4 种解决策略
3. **IPC 通信层** - 主进程与渲染进程的完整通信桥梁
4. **Preload API** - 类型安全的前端 API 接口

**测试结果**:
- ✅ `npm run test:unit` - 276 个单元测试全部通过
- ✅ `npm run test:integration` - 33 个集成测试全部通过
- ✅ 总测试数: 309 个测试用例，全部通过
- ✅ 服务覆盖率: 92.79% 语句覆盖率（超过 80% 目标）
  - ConfigService: 91.61%
  - BackupService: 93.09%
  - ConfigWatcher: 89.8%
  - SyncConflictResolver: 95.32%

**修复项**:
- 修复 `ConfigService.test.ts` 中 mock 对象共享导致的测试干扰问题（使用工厂函数创建新实例）
- 修复 `sync.test.ts` 中 mock 路径不匹配问题（使用 `@main/adapters` 别名 + globalThis 模式共享状态）
- 修复 `backup.test.ts` 中 vitest mock hoisting 问题（简化测试策略）

### Phase 5: 前端 UI - ✅ 已完成

**完成时间**: 2026-01-11

**创建的状态管理** (`src/renderer/stores/`):
- `useConfigStore.ts` - 配置状态管理
  - `configs` - 所有 IDE 配置
  - `selectedIDE` - 当前选中的 IDE
  - `toggleServer()` / `addServer()` / `removeServer()` / `updateServer()` - 乐观更新 UI
- `useSyncStore.ts` - 同步状态管理
  - `sourceIDE` / `targetIDEs` - 同步源和目标
  - `syncStatus` - 同步状态机 (idle/previewing/syncing/completed/error)
  - `previewSync()` - 触发预览
  - `executeSync()` - 执行同步

**创建的组件** (`src/renderer/components/`):
- `layout/`
  - `MainLayout.tsx` - 主布局容器
  - `Header.tsx` - 顶部导航栏
  - `Sidebar.tsx` - 侧边栏 IDE 列表
- `ide/`
  - `IDEList.tsx` - 仪表盘 IDE 网格视图
  - `IDECard.tsx` - 单个 IDE 卡片
- `server/`
  - `ServerList.tsx` - 服务器列表管理
  - `ServerCard.tsx` - 服务器配置卡片（支持开关、编辑、删除）
- `sync/`
  - `SyncPanel.tsx` - 同步操作面板（源/目标选择、策略选择）
  - `SyncPreview.tsx` - 变更预览组件
- `conflict/`
  - `ConflictResolver.tsx` - 冲突解决对话框
  - `ConflictItem.tsx` - 单个冲突项解决 UI

**集成** (`src/renderer/`):
- `App.tsx` - 应用入口，整合路由视图切换
- `hooks/useIPC.ts` - IPC 连接状态钩子

**创建的组件测试** (`tests/unit/components/`):
- `IDEComponents.test.tsx` - IDE 列表与卡片测试
- `ServerComponents.test.tsx` - 服务器管理测试
- `SyncComponents.test.tsx` - 同步面板与预览测试
- `ConflictComponents.test.tsx` - 冲突解决测试

**测试结果**:
- ✅ `npm run test:unit` - 所有组件和 Store 测试通过
- ✅ UI 交互逻辑覆盖率满足要求

### Phase 6: 高级功能 - ✅ 已完成

**完成时间**: 2026-01-11

**6.1 系统托盘支持** (`src/main/tray.ts`):
- `TrayGenerator` 类 - 完整的系统托盘管理
  - `createTray()` - 创建托盘图标和菜单
  - `updateState()` - 更新托盘状态（IDE数量、服务器数量、同步状态）
  - `setStatus()` - 设置同步状态指示器（normal/syncing/error）
  - `setCounts()` - 设置 IDE 和服务器计数
  - `setLastSyncTime()` - 设置最后同步时间
  - `getIsQuitting()` / `setIsQuitting()` - 退出状态管理
  - `destroy()` - 销毁托盘
- 功能特性:
  - 最小化到托盘（关闭窗口时隐藏而非退出）
  - 托盘右键菜单（显示应用、IDE/服务器计数、快速同步、退出）
  - 托盘图标工具提示显示当前状态
  - 跨平台图标支持（Windows/macOS/Linux）
  - 点击托盘图标切换窗口显示/隐藏

**6.2 配置导入/导出** (`src/main/services/ImportExportService.ts`):
- 单个 IDE 导入/导出:
  - `exportConfig(ideType)` - 导出单个 IDE 配置到 JSON 文件
  - `importConfig(ideType)` - 从 JSON 文件导入配置到指定 IDE
- 批量导入/导出:
  - `exportBatch(ideTypes)` - 批量导出多个 IDE 配置
  - `importBatch()` - 从批量备份文件导入所有配置
  - `exportAll()` - 导出所有已安装 IDE 的配置
- 导出文件格式:
  - 版本控制 (`version: "1.0"`)
  - 导出时间戳 (`exportedAt`)
  - 配置数组（包含 ideType、displayName、servers）
- 安全特性:
  - 导入前自动创建备份
  - 验证导入文件格式
  - 检查 IDE 是否已安装

**更新的 IPC 通道** (`src/shared/types.ts`):
- `CONFIG_EXPORT` - 导出单个配置
- `CONFIG_IMPORT` - 导入单个配置
- `CONFIG_EXPORT_BATCH` - 批量导出
- `CONFIG_IMPORT_BATCH` - 批量导入
- `CONFIG_EXPORT_ALL` - 导出全部

**更新的 IPC 处理器** (`src/main/ipc/config.handlers.ts`):
- 添加所有导入/导出相关的 IPC 处理器
- 错误处理和结果返回

**更新的预加载脚本** (`src/preload/index.ts`):
- `importExport.exportConfig()` - 导出配置 API
- `importExport.importConfig()` - 导入配置 API
- `importExport.exportBatch()` - 批量导出 API
- `importExport.importBatch()` - 批量导入 API
- `importExport.exportAll()` - 导出全部 API

**更新的主进程** (`src/main/index.ts`):
- 集成 TrayGenerator 创建和管理
- 实现最小化到托盘逻辑
- 应用启动时更新托盘状态（IDE/服务器计数）
- 应用退出时正确清理托盘

**更新的 IPC 初始化** (`src/main/ipc/index.ts`):
- 创建 ImportExportService 实例
- 将服务传递给 IPC 处理器注册

**创建的测试文件**:
- `tests/unit/tray.test.ts` - TrayGenerator 单元测试 (23 个测试)
  - 托盘创建测试
  - 状态更新测试
  - 窗口切换测试
  - 退出状态测试
- `tests/integration/import-export.test.ts` - 导入导出集成测试 (16 个测试)
  - 单个 IDE 导入/导出测试
  - 批量导入/导出测试
  - 错误处理测试
  - 取消操作测试

**测试结果**:
- ✅ `npm run test:unit` - 327 个单元测试全部通过
- ✅ `npm run test:integration` - 376 个测试全部通过（包含单元+集成）
- ✅ `npm run typecheck` - TypeScript 类型检查通过
- ✅ `npm run build` - 构建成功
- ✅ TrayGenerator 覆盖率: 93.1%

