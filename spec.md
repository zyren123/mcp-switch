# MCP Switch - MCP配置管理工具实现计划

## 项目概述
一个图形化桌面应用，用于统一管理多个IDE/CLI的MCP Server配置，支持一键同步和可视化开关控制。

## 支持的工具

> **跨平台支持**: 本工具支持 macOS、Windows、Linux 三大平台，配置文件路径会根据操作系统自动解析。

### 配置路径（跨平台）

| 工具 | macOS | Windows | Linux | 配置格式 |
|------|-------|---------|-------|----------|
| **Claude Desktop** | `~/Library/Application Support/Claude/claude_desktop_config.json` | `%APPDATA%\Claude\claude_desktop_config.json` | `~/.config/Claude/claude_desktop_config.json` | JSON |
| **Claude Code CLI** | `~/.claude.json` | `%USERPROFILE%\.claude.json` | `~/.claude.json` | JSON |
| **Cursor IDE** | `~/Library/Application Support/Cursor/User/globalStorage/mcp.json` | `%USERPROFILE%\.cursor\mcp.json` | `~/.config/Cursor/User/globalStorage/mcp.json` | JSON |
| **Windsurf IDE** | `~/.codeium/windsurf/mcp_config.json` | `%APPDATA%\Codeium\Windsurf\mcp_config.json` | `~/.codeium/windsurf/mcp_config.json` | JSON |
| **Codex CLI** (OpenAI) | `~/.codex/config.toml` | `%USERPROFILE%\.codex\config.toml` | `~/.codex/config.toml` | **TOML** |
| **OpenCode** | `~/.config/opencode/opencode.json` | `%USERPROFILE%\.config\opencode\opencode.json` | `~/.config/opencode/opencode.json` | JSON/JSONC |

### 配置层级说明

#### Claude Code CLI（用户级配置）

> **重要**: 本工具**仅管理 MCP 服务器配置**（`.claude.json`），不管理 `settings.json`（包含其他非 MCP 设置）。

- **MCP 服务器配置** `.claude.json`（本工具管理范围）
  - macOS/Linux: `~/.claude.json`
  - Windows: `%USERPROFILE%\.claude.json`
- **其他设置** `settings.json`（**不在本工具管理范围内**）
  - 包含 API 密钥、主题、编辑器设置等非 MCP 配置
  - 同步时**忽略此文件**，仅读取/写入 `.claude.json`

> **说明**: Claude Code 实际还有其他配置层级（Managed、Project、Local），但这些不在本工具的管理范围内。

#### OpenCode（用户级配置）

> **注意**: 以下配置层级信息需要进一步验证官方文档。本工具暂时仅支持用户级配置。

- **用户配置**: `~/.config/opencode/opencode.json`（跨平台）
  - macOS: `~/.config/opencode/opencode.json`
  - Windows: `%USERPROFILE%\.config\opencode\opencode.json`
  - Linux: `~/.config/opencode/opencode.json`

> **待验证**: OpenCode 是否支持 Remote、Custom Directory、Inline 等配置层级。

#### Codex CLI（唯一使用TOML格式）
所有其他工具都使用JSON格式，只有Codex CLI使用TOML格式。同步时需要特殊处理（JSON → TOML 转换）。

## 技术栈
- **框架**: Electron 28 + electron-vite
- **前端**: React 18 + TypeScript
- **UI**: Shadcn/ui + Tailwind CSS
- **状态管理**: Zustand
- **打包**: electron-builder
- **配置解析**:
  - `@iarna/toml` - TOML解析（Codex专用）
  - `jsonc-parser` - JSONC解析（支持注释和尾随逗号，OpenCode专用）

---

## 项目结构

```
mcp-switch/
├── package.json
├── electron.vite.config.ts
├── electron-builder.yml
├── tailwind.config.js
├── vitest.config.ts              # Vitest 配置
├── playwright.config.ts          # Playwright E2E 配置
├── src/
│   ├── main/                     # Electron主进程
│   │   ├── index.ts              # 入口
│   │   ├── ipc/                  # IPC处理器
│   │   │   ├── index.ts          # IPC 注册入口
│   │   │   └── config.handlers.ts
│   │   ├── services/             # 核心服务
│   │   │   ├── ConfigService.ts
│   │   │   ├── ConfigWatcher.ts
│   │   │   ├── BackupService.ts
│   │   │   └── SyncConflictResolver.ts
│   │   ├── adapters/             # IDE配置适配器
│   │   │   ├── BaseAdapter.ts
│   │   │   ├── ClaudeDesktopAdapter.ts
│   │   │   ├── ClaudeCodeAdapter.ts
│   │   │   ├── CursorAdapter.ts
│   │   │   ├── WindsurfAdapter.ts
│   │   │   ├── CodexAdapter.ts
│   │   │   ├── OpenCodeAdapter.ts
│   │   │   └── index.ts          # 适配器注册表
│   │   └── utils/
│   │       ├── platform.ts       # 跨平台路径解析
│   │       ├── configParser.ts   # 配置解析器
│   │       ├── envExpander.ts    # 环境变量扩展
│   │       ├── errors.ts         # 错误码定义
│   │       └── sanitizer.ts      # 敏感信息处理
│   ├── preload/                  # 预加载脚本
│   │   ├── index.ts
│   │   └── index.d.ts            # 类型声明
│   ├── renderer/                 # React前端
│   │   ├── index.html
│   │   ├── main.tsx              # React 入口
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── ui/               # Shadcn组件
│   │   │   ├── layout/
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   └── MainLayout.tsx
│   │   │   ├── ide/              # IDE列表组件
│   │   │   │   ├── IDEList.tsx
│   │   │   │   └── IDECard.tsx
│   │   │   ├── server/           # 服务器卡片组件
│   │   │   │   ├── ServerList.tsx
│   │   │   │   └── ServerCard.tsx
│   │   │   ├── sync/             # 同步面板组件
│   │   │   │   ├── SyncPanel.tsx
│   │   │   │   └── SyncPreview.tsx
│   │   │   └── conflict/         # 冲突解决UI组件
│   │   │       ├── ConflictResolver.tsx
│   │   │       └── ConflictItem.tsx
│   │   ├── stores/               # Zustand状态
│   │   │   ├── useConfigStore.ts
│   │   │   └── useSyncStore.ts
│   │   ├── hooks/                # 自定义 Hooks
│   │   │   └── useIPC.ts
│   │   ├── types/                # TypeScript类型
│   │   │   └── mcp.ts
│   │   └── styles/
│   │       └── globals.css
│   └── shared/                   # 主进程与渲染进程共享类型
│       └── types.ts
├── tests/                        # 测试目录
│   ├── unit/                     # 单元测试
│   │   ├── utils/
│   │   │   ├── platform.test.ts
│   │   │   ├── configParser.test.ts
│   │   │   ├── envExpander.test.ts
│   │   │   └── sanitizer.test.ts
│   │   ├── adapters/
│   │   │   ├── BaseAdapter.test.ts
│   │   │   ├── ClaudeDesktopAdapter.test.ts
│   │   │   ├── ClaudeCodeAdapter.test.ts
│   │   │   ├── CursorAdapter.test.ts
│   │   │   ├── WindsurfAdapter.test.ts
│   │   │   ├── CodexAdapter.test.ts
│   │   │   └── OpenCodeAdapter.test.ts
│   │   └── services/
│   │       ├── ConfigService.test.ts
│   │       ├── BackupService.test.ts
│   │       ├── ConfigWatcher.test.ts
│   │       └── SyncConflictResolver.test.ts
│   ├── integration/              # 集成测试
│   │   ├── sync.test.ts
│   │   ├── backup.test.ts
│   │   └── ipc.test.ts
│   ├── e2e/                      # 端到端测试
│   │   ├── app.spec.ts
│   │   ├── sync-flow.spec.ts
│   │   └── conflict-resolution.spec.ts
│   ├── fixtures/                 # 测试数据
│   │   ├── configs/
│   │   │   ├── claude-desktop.json
│   │   │   ├── claude-code.json
│   │   │   ├── cursor.json
│   │   │   ├── windsurf.json
│   │   │   ├── codex.toml
│   │   │   └── opencode.jsonc
│   │   └── corrupted/
│   │       ├── invalid-json.json
│   │       └── invalid-toml.toml
│   └── helpers/                  # 测试辅助函数
│       ├── setup.ts
│       └── mockFs.ts
└── resources/                    # 图标资源
    ├── icon.ico
    ├── icon.icns
    └── icon.png
```

---

## 跨平台路径解析

### 平台检测逻辑
```typescript
// src/main/utils/platform.ts
import * as os from 'os';
import * as path from 'path';

export interface PlatformConfig {
  darwin: string;  // macOS
  win32: string;   // Windows
  linux: string;   // Linux
}

export const getConfigPath = (ideType: string, scope: 'user' | 'project' | 'local' = 'user'): string => {
  const platform = process.platform; // 'darwin' | 'win32' | 'linux'
  const homeDir = os.homedir();
  const appData = process.env.APPDATA || '';
  const userProfile = process.env.USERPROFILE || os.homedir();

  // Windows 路径策略说明：
  // - APPDATA: 用于需要漫游配置的应用 (Claude Desktop, Windsurf)
  // - USERPROFILE: 用于遵循跨平台约定使用 ~/.config 结构的应用 (Claude Code, OpenCode, Codex, Cursor)
  const winBase = appData;

  const paths: Record<string, PlatformConfig> = {
    'claude-desktop': {
      darwin: path.join(homeDir, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'),
      win32: path.join(winBase, 'Claude', 'claude_desktop_config.json'),
      linux: path.join(homeDir, '.config', 'Claude', 'claude_desktop_config.json')
    },
    'claude-code': {
      darwin: path.join(homeDir, '.claude.json'),
      win32: path.join(userProfile, '.claude.json'),
      linux: path.join(homeDir, '.claude.json')
    },
    'cursor': {
      darwin: path.join(homeDir, 'Library', 'Application Support', 'Cursor', 'User', 'globalStorage', 'mcp.json'),
      win32: path.join(userProfile, '.cursor', 'mcp.json'),
      linux: path.join(homeDir, '.config', 'Cursor', 'User', 'globalStorage', 'mcp.json')
    },
    'windsurf': {
      darwin: path.join(homeDir, '.codeium', 'windsurf', 'mcp_config.json'),
      win32: path.join(winBase, 'Codeium', 'Windsurf', 'mcp_config.json'),
      linux: path.join(homeDir, '.codeium', 'windsurf', 'mcp_config.json')
    },
    'codex': {
      darwin: path.join(homeDir, '.codex', 'config.toml'),
      win32: path.join(userProfile, '.codex', 'config.toml'),
      linux: path.join(homeDir, '.codex', 'config.toml')
    },
    'opencode': {
      darwin: path.join(homeDir, '.config', 'opencode', 'opencode.json'),
      win32: path.join(userProfile, '.config', 'opencode', 'opencode.json'),
      linux: path.join(homeDir, '.config', 'opencode', 'opencode.json')
    }
  };

  return paths[ideType]?.[platform] || '';
};

/**
 * 获取 Claude Code 的 MCP 配置文件路径
 * 注意：仅返回 MCP 服务器配置路径，不包含 settings.json（其他设置）
 * 与 getConfigPath('claude-code') 返回相同的路径
 */
export const getClaudeCodeConfigPath = (): string => {
  return getConfigPath('claude-code');
};
```

### 配置格式处理
```typescript
// src/main/utils/configParser.ts

import toml from '@iarna/toml';

// 不同的工具需要不同的解析器
export const configParsers: Record<string, (content: string) => any> = {
  'claude-desktop': JSON.parse,
  'claude-code': JSON.parse,
  'cursor': JSON.parse,
  'windsurf': JSON.parse,
  'codex': (content: string) => toml.parse(content),
  'opencode': parseJSONC  // JSONC 支持注释
};

export const configFormatters: Record<string, (data: any) => string> = {
  'claude-desktop': (data) => JSON.stringify(data, null, 2),
  'claude-code': (data) => JSON.stringify(data, null, 2),
  'cursor': (data) => JSON.stringify(data, null, 2),
  'windsurf': (data) => JSON.stringify(data, null, 2),
  'codex': (data: any) => toml.stringify(data),
  'opencode': formatJSONC
};

/**
 * JSONC 解析器（支持注释和尾随逗号）
 * 需要安装: npm install jsonc-parser
 */
import { parse } from 'jsonc-parser';

export const parseJSONC = (content: string): any => {
  const errors: any[] = [];
  const result = parse(content, errors, {
    allowTrailingComma: true,
    allowComments: true,
    allowEmptyContent: true
  });

  if (errors.length > 0) {
    throw new Error(`JSONC parse error at position ${errors[0].offset}: ${errors[0].message}`);
  }

  return result;
};

/**
 * JSONC 格式化输出（保持注释需要特殊处理，此处简单输出标准 JSON）
 */
export const formatJSONC = (data: any): string => {
  return JSON.stringify(data, null, 2);
};

/**
 * 深度合并多个配置对象
 * - 对象类型配置: 递归合并
 * - 数组类型配置: 取并集（去重）
 * - 原始类型配置: 后面的覆盖前面的
 */
export const deepMerge = (...configs: any[]): any => {
  const result: any = {};

  for (const config of configs) {
    if (!config || typeof config !== 'object') continue;

    for (const key of Object.keys(config)) {
      if (config[key] === undefined) continue;

      if (Array.isArray(config[key])) {
        // 数组: 取并集
        if (!Array.isArray(result[key])) {
          result[key] = [];
        }
        // 合并数组并去重
        const uniqueItems = new Set([...result[key], ...config[key]]);
        result[key] = Array.from(uniqueItems);
      } else if (config[key] && typeof config[key] === 'object') {
        // 对象: 递归合并
        result[key] = deepMerge(result[key], config[key]);
      } else {
        // 原始类型: 覆盖
        result[key] = config[key];
      }
    }
  }

  return result;
};
```

### 环境变量扩展
某些工具支持环境变量扩展：
- **Claude Code**: 支持 `${VAR}` 和 `${VAR:-default}` 语法
- **Windsurf**: 支持 `${env:VAR}` 语法
- **OpenCode**: 支持 `{env:VARIABLE_NAME}` 语法

实现时需要处理这些特殊语法：
```typescript
// src/main/utils/envExpander.ts

export const expandEnvVars = (content: string, env: Record<string, string> = process.env): string => {
  // Claude Code: ${VAR} 或 ${VAR:-default}
  content = content.replace(/\$\{([^}:]+)(?::-([^}]*))?\}/g, (_, name, defaultValue) => {
    return env[name] || defaultValue || '';
  });

  // Windsurf: ${env:VAR}
  content = content.replace(/\$\{env:([^}]+)\}/g, (_, name) => {
    return env[name] || '';
  });

  // OpenCode: {env:VARIABLE_NAME}
  content = content.replace(/\{env:([^}]+)\}/g, (_, name) => {
    return env[name] || '';
  });

  return content;
};
```

### 环境变量同步策略

> **核心原则**: 同步时**保留原始语法**，不进行变量展开。目标 IDE 会在运行时自行扩展环境变量。

| 场景 | 处理方式 | 原因 |
|------|----------|------|
| **同步时** | 保留 `${VAR}`、`${env:VAR}`、`{env:VAR}` 原样 | 不同 IDE 语法不同，保持源配置兼容性 |
| **读取配置显示时** | 可选展开（用于预览） | 帮助用户确认变量值是否正确 |
| **写入配置时** | 保持原始语法 | 目标 IDE 激活时自行处理 |

#### 语法兼容性说明

| 源 IDE | 源语法 | 目标 IDE | 目标语法 | 是否需要转换 |
|--------|--------|----------|----------|-------------|
| Claude Code | `${VAR}` | Windsurf | `${env:VAR}` | ❌ 保留原样 |
| Windsurf | `${env:VAR}` | Claude Code | `${VAR}` | ❌ 保留原样 |
| OpenCode | `{env:VAR}` | 其他 | `${VAR}` | ❌ 保留原样 |

#### 特殊语法处理

```typescript
// Claude Code 支持默认值语法: ${VAR:-default}
const claudeCodeDefaultPattern = /\$\{([^}:]+)(?::-([^}]*))?\}/g;

// 同步时检测并保留默认值语法
export const hasDefaultValue = (value: string): boolean => {
  return claudeCodeDefaultPattern.test(value);
};
```

> **重要**: 如果源配置包含 `${API_KEY:-${SECONDARY_KEY}}` 这样的链式引用，保留原始字符串，不要尝试解析。

---

## 错误处理机制

### 错误码定义

```typescript
// src/main/utils/errors.ts

export enum ConfigErrorCode {
  // 成功
  SUCCESS = 0,

  // 文件操作错误 (1xx)
  FILE_NOT_FOUND = 100,
  FILE_READ_ERROR = 101,
  FILE_WRITE_ERROR = 102,
  FILE_PERMISSION_DENIED = 103,

  // 解析错误 (2xx)
  PARSE_JSON_ERROR = 200,
  PARSE_TOML_ERROR = 201,
  PARSE_UNKNOWN_FORMAT = 202,

  // 同步错误 (3xx)
  SYNC_SOURCE_INVALID = 300,
  SYNC_TARGET_INVALID = 301,
  SYNC_CONFLICT = 302,
  SYNC_BACKUP_FAILED = 303,

  // 配置错误 (4xx)
  CONFIG_INVALID_STRUCTURE = 400,
  CONFIG_MISSING_REQUIRED_FIELD = 401,

  // 系统错误 (5xx)
  PLATFORM_UNSUPPORTED = 500,
  IPC_COMMUNICATION_ERROR = 501
}

export interface ConfigError extends Error {
  code: ConfigErrorCode;
  path?: string;
  details?: any;
}

export const createConfigError = (
  message: string,
  code: ConfigErrorCode,
  path?: string,
  details?: any
): ConfigError => {
  const error = new Error(message) as ConfigError;
  error.code = code;
  error.path = path;
  error.details = details;
  return error;
};
```

### 错误处理策略

| 错误类型 | 处理策略 | 用户提示 |
|----------|----------|----------|
| 配置文件不存在 | 创建空配置或询问用户是否创建 | "配置文件不存在，是否创建？" |
| JSON/TOML 解析失败 | 回退到上一次有效配置，显示错误位置 | "配置文件格式错误，请检查语法" |
| 文件写入权限不足 | 提示用户以管理员身份运行或检查权限 | "无法写入文件，请检查权限" |
| 路径解析失败 | 使用备用路径，显示警告 | "无法解析配置路径，使用默认路径" |

### 配置文件损坏恢复策略

> **检测 → 恢复 → 通知** 三步走策略

#### 损坏检测

```typescript
// src/main/services/ConfigCorruptionDetector.ts

export interface CorruptionCheckResult {
  isCorrupted: boolean;
  errorType: 'syntax_error' | 'missing_field' | 'invalid_type' | 'unknown';
  errorLocation?: { line: number; column: number };
  suggestion?: string;
}

export const checkConfigIntegrity = async (
  ideType: string,
  content: string
): Promise<CorruptionCheckResult> => {
  try {
    // 1. 尝试解析
    const config = configParsers[ideType](content);

    // 2. 验证必需字段
    if (ideType === 'claude-desktop' || ideType === 'claude-code') {
      if (!config.mcpServers || typeof config.mcpServers !== 'object') {
        return {
          isCorrupted: true,
          errorType: 'missing_field',
          suggestion: '缺少 mcpServers 字段，建议重新初始化配置'
        };
      }
    }

    return { isCorrupted: false, errorType: 'unknown' };
  } catch (error: any) {
    // 3. 解析错误位置
    const errorLocation = parseErrorLocation(error.message);

    return {
      isCorrupted: true,
      errorType: 'syntax_error',
      errorLocation,
      suggestion: getSyntaxSuggestion(error.message, ideType)
    };
  }
};
```

#### 恢复优先级

| 优先级 | 来源 | 条件 | 说明 |
|--------|------|------|------|
| 1 | 内存缓存 | 应用未重启 | 保留最近一次成功解析的配置 |
| 2 | 备份文件 | 存在有效备份 | 自动恢复到最近一次备份 |
| 3 | 空配置 | 无备份 | 创建仅含结构框架的空配置 |

#### 恢复流程

```
检测到配置损坏
       ↓
[有内存缓存?] ─否──→ [有备份?] ─否──→ [创建空配置]
       ↓是                    ↓是
  恢复内存缓存            恢复到最近备份
       ↓                    ↓
  提示用户              提示用户并显示备份时间
       ↓                    ↓
  [用户确认?]           [用户可选择其他备份]
```

#### 恢复后处理

| 场景 | 处理方式 |
|------|----------|
| 内存缓存恢复 | 静默恢复，不打扰用户 |
| 备份恢复 | 提示 "已从备份恢复"，显示备份时间 |
| 空配置 | 提示 "创建了新的空配置" |
| 恢复失败 | 显示详细错误，提供手动修复指引 |

---

## 同步冲突解决机制

### 冲突检测算法

```typescript
// src/main/services/SyncConflictResolver.ts

export interface SyncConflict {
  serverId: string;
  sourceValue: MCPServerConfig | FieldValue | undefined;
  targetValue: MCPServerConfig | FieldValue | undefined;
  field: 'command' | 'args' | 'env' | 'enabled' | 'server';  // 'server' 表示整个服务器级别的冲突
  conflictType: 'value_mismatch' | 'missing_in_source' | 'missing_in_target';
}

// 单个字段的值类型
type FieldValue = string | string[] | Record<string, string> | boolean;

// 服务器配置类型（用于整个服务器缺失的情况）
interface MCPServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  enabled?: boolean;
}

export interface SyncResult {
  success: boolean;
  conflicts: SyncConflict[];
  mergedConfig: any;
  needsUserResolution: boolean;
}

export class SyncConflictResolver {
  /**
   * 检测两个配置之间的冲突
   */
  detectConflicts(sourceConfig: any, targetConfig: any): SyncConflict[] {
    const conflicts: SyncConflict[] = [];
    const sourceServers = sourceConfig.mcpServers || {};
    const targetServers = targetConfig.mcpServers || {};

    const allServerIds = new Set([
      ...Object.keys(sourceServers),
      ...Object.keys(targetServers)
    ]);

    for (const serverId of allServerIds) {
      const source = sourceServers[serverId];
      const target = targetServers[serverId];

      if (!source && target) {
        conflicts.push({
          serverId,
          sourceValue: undefined,
          targetValue: target,
          field: 'server',  // 整个服务器级别的冲突
          conflictType: 'missing_in_source'
        });
      } else if (source && !target) {
        conflicts.push({
          serverId,
          sourceValue: source,
          targetValue: undefined,
          field: 'server',  // 整个服务器级别的冲突
          conflictType: 'missing_in_target'
        });
      } else if (source && target) {
        // 检查各个字段的冲突
        this.checkFieldConflicts(serverId, source, target, conflicts);
      }
    }

    return conflicts;
  }

  private checkFieldConflicts(
    serverId: string,
    source: any,
    target: any,
    conflicts: SyncConflict[]
  ): void {
    const fields: Array<'command' | 'args' | 'env' | 'enabled'> = ['command', 'args', 'env', 'enabled'];

    for (const field of fields) {
      if (JSON.stringify(source[field]) !== JSON.stringify(target[field])) {
        conflicts.push({
          serverId,
          sourceValue: source[field],
          targetValue: target[field],
          field,
          conflictType: 'value_mismatch'
        });
      }
    }
  }
}
```

### 冲突解决策略

| 策略 | 描述 | 使用场景 |
|------|------|----------|
| **保留源 (Keep Source)** | 使用源 IDE 的配置覆盖目标 | 默认策略，适合"推送到所有"场景 |
| **保留目标 (Keep Target)** | 保留目标配置，忽略源配置 | 只想更新部分服务器时 |
| **合并 (Merge)** | 智能合并，保留双方差异 | 双方有不同的有效服务器时 |
| **手动解决 (Manual)** | 用户逐一选择保留哪个 | 冲突复杂，需要用户判断时 |

### 同步流程

```
1. 选择源 IDE → 选择目标 IDE(可多选)
2. 预览变更（显示冲突检测结果）
3. 选择冲突解决策略：
   - 自动：使用"保留源"策略
   - 手动：弹出冲突解决UI
4. 自动备份目标配置（备份目录: ~/.mcp-switch/backup/）
5. 执行同步
6. 验证写入结果
7. 刷新目标 IDE 配置状态
```

---

## 实现步骤（详细计划）

> **测试驱动开发**: 每个 Phase 完成后必须通过对应的单元测试，确保模块功能正常。

---

### Phase 1: 项目初始化 ✅ 已完成

> **完成状态**: 2026-01-11 已完成
> - ✅ `npm run build` - 构建成功
> - ✅ `npm run dev` - 应用正常启动
> - 📝 Shadcn/ui 组件将在 Phase 5 UI 开发时按需安装

#### 1.1 创建 Electron + Vite 项目
```bash
npm create @electron-vite/project mcp-switch -- --template react-ts
cd mcp-switch
npm install
```

#### 1.2 安装核心依赖
```bash
# UI 框架
npm install tailwindcss postcss autoprefixer
npm install -D @types/node

# 状态管理
npm install zustand

# 配置解析
npm install @iarna/toml jsonc-parser

# 测试框架
npm install -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom
npm install -D playwright @playwright/test
npm install -D memfs  # 文件系统 mock
```

#### 1.3 配置 Tailwind CSS
创建 `tailwind.config.js` 和 `postcss.config.js`，配置 `src/renderer/styles/globals.css`。

#### 1.4 安装 Shadcn/ui
```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card switch dialog toast
```

#### 1.5 设置项目目录结构
按照项目结构图创建所有目录和占位文件。

#### Phase 1 测试验收
```bash
npm run dev          # 应用正常启动
npm run build        # 构建无错误
```

**产出文件**:
- `package.json` (含所有依赖)
- `electron.vite.config.ts`
- `tailwind.config.js`
- `vitest.config.ts`
- `src/renderer/styles/globals.css`

---

### Phase 2: 核心数据模型与共享类型 ✅ 已完成

> **完成状态**: 2026-01-11 已完成
> - ✅ `npm run typecheck` - TypeScript 类型检查通过
> - ✅ `src/shared/types.ts` - 共享类型定义完成
> - ✅ `src/renderer/types/mcp.ts` - 渲染进程类型定义完成

#### 2.1 创建共享类型定义
创建 `src/shared/types.ts`:
```typescript
// IDE 类型
export type IDEType = 'claude-desktop' | 'claude-code' | 'cursor' | 'windsurf' | 'codex' | 'opencode';

// MCP 服务器配置
export interface MCPServer {
  id: string;
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  enabled: boolean;
}

// IDE 配置
export interface IDEConfig {
  type: IDEType;
  name: string;
  displayName: string;
  configPath: string;
  configFormat: 'json' | 'toml' | 'jsonc';
  isInstalled: boolean;
  servers: MCPServer[];
  lastSynced?: number;
  syncStatus: 'synced' | 'pending' | 'error' | 'unknown';
}

// 同步冲突
export interface SyncConflict {
  serverId: string;
  sourceValue: any;
  targetValue: any;
  field: 'command' | 'args' | 'env' | 'enabled' | 'server';
  conflictType: 'value_mismatch' | 'missing_in_source' | 'missing_in_target';
}

// 同步操作
export interface SyncOperation {
  id: string;
  sourceIDE: IDEType;
  targetIDEs: IDEType[];
  strategy: 'overwrite' | 'merge' | 'keep-target' | 'manual';
  conflicts: SyncConflict[];
  timestamp: number;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
}

// 备份信息
export interface BackupInfo {
  id: string;
  ideType: IDEType;
  timestamp: number;
  path: string;
  size: number;
}

// IPC 通道定义
export const IPC_CHANNELS = {
  // 配置操作
  CONFIG_LOAD_ALL: 'config:load-all',
  CONFIG_LOAD_ONE: 'config:load-one',
  CONFIG_SAVE: 'config:save',
  CONFIG_REFRESH: 'config:refresh',

  // 服务器操作
  SERVER_TOGGLE: 'server:toggle',
  SERVER_ADD: 'server:add',
  SERVER_REMOVE: 'server:remove',
  SERVER_UPDATE: 'server:update',

  // 同步操作
  SYNC_PREVIEW: 'sync:preview',
  SYNC_EXECUTE: 'sync:execute',
  SYNC_RESOLVE_CONFLICT: 'sync:resolve-conflict',

  // 备份操作
  BACKUP_CREATE: 'backup:create',
  BACKUP_RESTORE: 'backup:restore',
  BACKUP_LIST: 'backup:list',

  // 事件通知
  CONFIG_CHANGED: 'config:changed',
  SYNC_STATUS_UPDATE: 'sync:status-update',
} as const;
```

#### 2.2 创建渲染进程类型
创建 `src/renderer/types/mcp.ts`，从 shared 导入并扩展前端专用类型。

#### Phase 2 测试验收
```bash
npm run typecheck    # TypeScript 类型检查通过
```

**产出文件**:
- `src/shared/types.ts`
- `src/renderer/types/mcp.ts`

---

### Phase 3: 工具函数与配置适配器 ✅ 已完成

> **完成状态**: 2026-01-11 已完成
> - ✅ `npm run test:unit` - 192 个测试全部通过
> - ✅ 总体覆盖率 90.97%（超过 90% 目标）
> - ✅ 所有工具函数和适配器已实现

#### 3.1 跨平台路径解析 (`src/main/utils/platform.ts`)
实现 `getConfigPath(ideType, platform)` 函数，支持 macOS/Windows/Linux。

**单元测试**: `tests/unit/utils/platform.test.ts`
```typescript
describe('platform.ts', () => {
  it('should return correct path for Claude Desktop on Windows');
  it('should return correct path for Claude Code on macOS');
  it('should return correct path for Codex on Linux');
  it('should handle missing environment variables gracefully');
});
```

#### 3.2 配置解析器 (`src/main/utils/configParser.ts`)
实现 JSON、TOML、JSONC 解析器和格式化器。

**单元测试**: `tests/unit/utils/configParser.test.ts`
```typescript
describe('configParser.ts', () => {
  describe('JSON parsing', () => {
    it('should parse valid JSON config');
    it('should throw ConfigError on invalid JSON');
  });
  describe('TOML parsing', () => {
    it('should parse valid TOML config');
    it('should convert TOML to normalized format');
  });
  describe('JSONC parsing', () => {
    it('should parse JSONC with comments');
    it('should handle trailing commas');
  });
  describe('deepMerge', () => {
    it('should merge objects recursively');
    it('should merge arrays with deduplication');
  });
});
```

#### 3.3 环境变量扩展器 (`src/main/utils/envExpander.ts`)
实现 `expandEnvVars()` 和 `hasEnvVarSyntax()` 函数。

**单元测试**: `tests/unit/utils/envExpander.test.ts`
```typescript
describe('envExpander.ts', () => {
  it('should expand ${VAR} syntax (Claude Code)');
  it('should expand ${VAR:-default} with default value');
  it('should expand ${env:VAR} syntax (Windsurf)');
  it('should expand {env:VAR} syntax (OpenCode)');
  it('should preserve unexpanded syntax when env var missing');
});
```

#### 3.4 错误处理 (`src/main/utils/errors.ts`)
实现 `ConfigErrorCode` 枚举和 `createConfigError()` 工厂函数。

#### 3.5 敏感信息处理 (`src/main/utils/sanitizer.ts`)
实现 `sanitizeConfig()` 和 `containsSensitiveInfo()` 函数。

**单元测试**: `tests/unit/utils/sanitizer.test.ts`
```typescript
describe('sanitizer.ts', () => {
  it('should redact apiKey fields');
  it('should redact nested sensitive fields');
  it('should detect configs containing sensitive info');
});
```

#### 3.6 BaseAdapter 抽象类 (`src/main/adapters/BaseAdapter.ts`)
```typescript
export abstract class BaseAdapter {
  abstract readonly ideType: IDEType;
  abstract readonly displayName: string;
  abstract readonly configFormat: 'json' | 'toml' | 'jsonc';

  abstract getConfigPath(): string;
  abstract parseConfig(content: string): any;
  abstract formatConfig(config: any): string;
  abstract normalizeServers(rawConfig: any): MCPServer[];
  abstract denormalizeServers(servers: MCPServer[]): any;

  async readConfig(): Promise<IDEConfig>;
  async writeConfig(config: IDEConfig): Promise<void>;
  async checkInstalled(): Promise<boolean>;
}
```

#### 3.7 实现 6 个 IDE 适配器
| 适配器 | 配置格式 | 特殊处理 |
|--------|----------|----------|
| ClaudeDesktopAdapter | JSON | 标准实现 |
| ClaudeCodeAdapter | JSON | 仅管理 `.claude.json` |
| CursorAdapter | JSON | 标准实现 |
| WindsurfAdapter | JSON | `${env:VAR}` 语法 |
| CodexAdapter | TOML | JSON ↔ TOML 转换 |
| OpenCodeAdapter | JSONC | 支持注释和尾随逗号 |

**单元测试**: 每个适配器都需要测试文件
```typescript
// tests/unit/adapters/ClaudeDesktopAdapter.test.ts
describe('ClaudeDesktopAdapter', () => {
  it('should return correct config path for current platform');
  it('should parse config file correctly');
  it('should normalize servers from raw config');
  it('should write config preserving structure');
  it('should detect if Claude Desktop is installed');
});
```

#### 3.8 适配器注册表 (`src/main/adapters/index.ts`)
```typescript
export const adapters: Record<IDEType, BaseAdapter> = {
  'claude-desktop': new ClaudeDesktopAdapter(),
  'claude-code': new ClaudeCodeAdapter(),
  'cursor': new CursorAdapter(),
  'windsurf': new WindsurfAdapter(),
  'codex': new CodexAdapter(),
  'opencode': new OpenCodeAdapter(),
};
```

#### Phase 3 测试验收
```bash
npm run test:unit -- --grep "utils|adapters"
```

**测试覆盖率要求**: ≥ 90%

**产出文件**:
- `src/main/utils/platform.ts`
- `src/main/utils/configParser.ts`
- `src/main/utils/envExpander.ts`
- `src/main/utils/errors.ts`
- `src/main/utils/sanitizer.ts`
- `src/main/adapters/BaseAdapter.ts`
- `src/main/adapters/ClaudeDesktopAdapter.ts`
- `src/main/adapters/ClaudeCodeAdapter.ts`
- `src/main/adapters/CursorAdapter.ts`
- `src/main/adapters/WindsurfAdapter.ts`
- `src/main/adapters/CodexAdapter.ts`
- `src/main/adapters/OpenCodeAdapter.ts`
- `src/main/adapters/index.ts`
- `tests/unit/utils/*.test.ts`
- `tests/unit/adapters/*.test.ts`

---

### Phase 4: 主进程服务 ✅ 已完成

> **完成状态**: 2026-01-11 已完成
> - ✅ `ConfigService.ts` - 统一配置管理服务
> - ✅ `SyncConflictResolver.ts` - 同步冲突解决服务
> - ✅ `config.handlers.ts` 和 `index.ts` - IPC 处理器
> - ✅ `src/preload/index.ts` - 预加载脚本更新
> - ✅ `src/main/index.ts` - 主进程集成 IPC
> - ✅ 309 个测试全部通过（276 单元 + 33 集成）
> - ✅ 服务覆盖率 92.79%（超过 80% 目标）

#### 4.1 ConfigService (`src/main/services/ConfigService.ts`)
统一配置管理服务，聚合所有适配器操作。

```typescript
export class ConfigService {
  async loadAllConfigs(): Promise<IDEConfig[]>;
  async loadConfig(ideType: IDEType): Promise<IDEConfig>;
  async saveConfig(ideType: IDEType, config: IDEConfig): Promise<void>;
  async toggleServer(ideType: IDEType, serverId: string, enabled: boolean): Promise<void>;
  async addServer(ideType: IDEType, server: MCPServer): Promise<void>;
  async removeServer(ideType: IDEType, serverId: string): Promise<void>;
}
```

**单元测试**: `tests/unit/services/ConfigService.test.ts`

#### 4.2 BackupService (`src/main/services/BackupService.ts`)
实现备份创建、恢复、列表、清理功能。

**单元测试**: `tests/unit/services/BackupService.test.ts`
```typescript
describe('BackupService', () => {
  it('should create backup with correct filename format');
  it('should restore backup content correctly');
  it('should list backups sorted by timestamp');
  it('should cleanup old backups keeping only 10');
  it('should handle ideType with underscores correctly');
});
```

#### 4.3 ConfigWatcher (`src/main/services/ConfigWatcher.ts`)
实现文件监听服务，支持 debounce 和目录级监听。

**单元测试**: `tests/unit/services/ConfigWatcher.test.ts`
```typescript
describe('ConfigWatcher', () => {
  it('should debounce rapid file changes');
  it('should only trigger callback for target config file');
  it('should handle non-existent config directory');
  it('should cleanup watchers on unwatch');
});
```

#### 4.4 SyncConflictResolver (`src/main/services/SyncConflictResolver.ts`)
实现冲突检测和解决策略。

**单元测试**: `tests/unit/services/SyncConflictResolver.test.ts`
```typescript
describe('SyncConflictResolver', () => {
  describe('detectConflicts', () => {
    it('should detect missing_in_source conflicts');
    it('should detect missing_in_target conflicts');
    it('should detect field value mismatches');
  });
  describe('resolveConflicts', () => {
    it('should apply keep-source strategy');
    it('should apply keep-target strategy');
    it('should apply merge strategy');
  });
});
```

#### 4.5 IPC 通信层 (`src/main/ipc/`)
创建 `config.handlers.ts` 和 `index.ts`，注册所有 IPC 处理器。

```typescript
// src/main/ipc/config.handlers.ts
export const registerConfigHandlers = (configService: ConfigService) => {
  ipcMain.handle(IPC_CHANNELS.CONFIG_LOAD_ALL, async () => {
    return configService.loadAllConfigs();
  });
  // ... 其他处理器
};
```

#### 4.6 Preload 脚本 (`src/preload/index.ts`)
暴露安全的 API 给渲染进程。

```typescript
import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/types';

contextBridge.exposeInMainWorld('electronAPI', {
  config: {
    loadAll: () => ipcRenderer.invoke(IPC_CHANNELS.CONFIG_LOAD_ALL),
    loadOne: (ideType: string) => ipcRenderer.invoke(IPC_CHANNELS.CONFIG_LOAD_ONE, ideType),
    // ...
  },
  sync: {
    preview: (source: string, targets: string[]) =>
      ipcRenderer.invoke(IPC_CHANNELS.SYNC_PREVIEW, source, targets),
    execute: (operation: any) =>
      ipcRenderer.invoke(IPC_CHANNELS.SYNC_EXECUTE, operation),
    // ...
  },
  onConfigChanged: (callback: Function) =>
    ipcRenderer.on(IPC_CHANNELS.CONFIG_CHANGED, (_, data) => callback(data)),
});
```

#### Phase 4 测试验收
```bash
npm run test:unit -- --grep "services"
npm run test:integration
```

**测试覆盖率要求**: ≥ 80%

**产出文件**:
- `src/main/services/ConfigService.ts`
- `src/main/services/BackupService.ts`
- `src/main/services/ConfigWatcher.ts`
- `src/main/services/SyncConflictResolver.ts`
- `src/main/ipc/config.handlers.ts`
- `src/main/ipc/index.ts`
- `src/preload/index.ts`
- `src/preload/index.d.ts`
- `tests/unit/services/*.test.ts`
- `tests/integration/*.test.ts`

---

### Phase 5: 前端 UI ✅ 已完成

> **完成状态**: 2026-01-11 已完成
> - ✅ `useConfigStore` & `useSyncStore` - 状态管理实现
> - ✅ 所有核心 UI 组件实现 (Layout, IDE, Server, Sync, Conflict)
> - ✅ `App.tsx` 集成
> - ✅ 组件单元测试全部通过

#### 5.1 Zustand 状态管理

**useConfigStore** (`src/renderer/stores/useConfigStore.ts`):
```typescript
interface ConfigStore {
  configs: IDEConfig[];
  selectedIDE: IDEType | null;
  isLoading: boolean;
  error: string | null;

  loadConfigs: () => Promise<void>;
  selectIDE: (ideType: IDEType) => void;
  toggleServer: (ideType: IDEType, serverId: string, enabled: boolean) => Promise<void>;
  refreshConfig: (ideType: IDEType) => Promise<void>;
}
```

**useSyncStore** (`src/renderer/stores/useSyncStore.ts`):
```typescript
interface SyncStore {
  sourceIDE: IDEType | null;
  targetIDEs: IDEType[];
  conflicts: SyncConflict[];
  syncStatus: 'idle' | 'previewing' | 'syncing' | 'completed' | 'error';

  setSource: (ideType: IDEType) => void;
  toggleTarget: (ideType: IDEType) => void;
  previewSync: () => Promise<void>;
  executeSync: (strategy: string) => Promise<void>;
}
```

#### 5.2 布局组件
- `MainLayout.tsx` - 主布局容器
- `Header.tsx` - 顶部栏（应用标题、状态指示器）
- `Sidebar.tsx` - 侧边栏（IDE 列表、快捷操作）

#### 5.3 IDE 组件
- `IDEList.tsx` - IDE 列表容器
- `IDECard.tsx` - 单个 IDE 卡片（显示名称、状态、服务器数量）

#### 5.4 服务器组件
- `ServerList.tsx` - 服务器列表容器
- `ServerCard.tsx` - 单个服务器卡片（名称、命令、开关按钮）

#### 5.5 同步组件
- `SyncPanel.tsx` - 同步操作面板
- `SyncPreview.tsx` - 同步预览（显示将要同步的变更）

#### 5.6 冲突解决组件
- `ConflictResolver.tsx` - 冲突解决对话框
- `ConflictItem.tsx` - 单个冲突项（显示源/目标值，选择按钮）

#### 5.7 自定义 Hooks
- `useIPC.ts` - 封装 IPC 调用的 Hook

#### 5.8 集成主应用
`App.tsx` 整合所有组件，实现完整 UI 流程。

#### Phase 5 测试验收
```bash
npm run test:unit -- --grep "components|stores"
npm run dev  # 手动验证 UI 功能
```

**产出文件**:
- `src/renderer/stores/useConfigStore.ts`
- `src/renderer/stores/useSyncStore.ts`
- `src/renderer/hooks/useIPC.ts`
- `src/renderer/components/layout/*.tsx`
- `src/renderer/components/ide/*.tsx`
- `src/renderer/components/server/*.tsx`
- `src/renderer/components/sync/*.tsx`
- `src/renderer/components/conflict/*.tsx`
- `src/renderer/App.tsx`

---

### Phase 6: 高级功能 ✅ 已完成

> **完成状态**: 2026-01-11 已完成
> - ✅ `TrayGenerator` - 系统托盘支持（最小化到托盘、右键菜单、状态指示）
> - ✅ `ImportExportService` - 配置导入/导出（单个/批量/全部）
> - ✅ 327 个单元测试 + 376 个集成测试全部通过
> - ✅ `npm run build` - 构建成功

#### 6.1 系统托盘支持
- 最小化到托盘
- 托盘右键菜单
- 托盘图标状态指示

#### 6.2 配置导入/导出
- 导出当前 IDE 配置到文件
- 从文件导入配置
- 支持批量导入/导出

#### Phase 6 测试验收
```bash
npm run test:integration -- --grep "tray|import|export"
```

**产出文件**:
- `src/main/tray.ts`
- `src/main/services/ImportExportService.ts`

---

### Phase 7: 打包发布

#### 7.1 配置 electron-builder
创建 `electron-builder.yml`:
```yaml
appId: com.mcp-switch.app
productName: MCP Switch
directories:
  buildResources: resources
  output: dist
files:
  - '!**/.vscode/*'
  - '!src/*'
  - '!tests/*'
win:
  target:
    - target: nsis
      arch:
        - x64
  icon: resources/icon.ico
nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
mac:
  target:
    - target: dmg
      arch:
        - x64
        - arm64
  icon: resources/icon.icns
linux:
  target:
    - target: AppImage
      arch:
        - x64
  icon: resources/icon.png
```

#### 7.2 生成安装包
```bash
npm run build
npm run package:win   # Windows
npm run package:mac   # macOS
npm run package:linux # Linux
```

#### Phase 7 测试验收
```bash
npm run test:e2e      # 端到端测试
npm run package       # 打包成功
# 手动安装测试
```

**产出文件**:
- `electron-builder.yml`
- `dist/` (构建产物)
- `release/` (安装包)

---

## 核心功能规格

### 同步功能
- **默认模式**: 覆盖 (源IDE配置完全替换目标)
- **流程**: 选择源IDE → 选择目标IDE(可多选) → 预览 → 同步
- **自动备份**: 同步前自动备份目标配置
- **冲突解决**: 支持4种策略（覆盖/合并/保留目标/手动）

### 服务器开关
- 对每个IDE可单独开关某个MCP Server
- 开关状态直接写入对应IDE的配置文件
- 乐观更新：UI先更新，失败则回滚

### 系统托盘
- 最小化到托盘
- 右键菜单快速访问
- 显示已配置的IDE数量
- 托盘图标显示同步状态（正常=绿色，有错误=红色）

---

## 性能指标

| 指标 | 目标值 | 说明 |
|------|--------|------|
| 配置加载时间 | < 500ms | 6个IDE配置文件全部加载完成 |
| 同步操作耗时 | < 2s | 10个服务器的配置同步 |
| 文件监听响应 | < 300ms | debounce 时间 |
| 内存占用 | < 100MB | 空闲状态 |
| 配置文件大小限制 | < 1MB | 超过则警告 |
| 备份保留数量 | 10 个 | 自动清理旧备份 |

---

## 安全性设计

### 敏感信息处理

```typescript
// src/main/utils/sanitizer.ts

/**
 * 敏感字段列表
 */
const SENSITIVE_FIELDS = [
  'apiKey',
  'api_key',
  'secret',
  'password',
  'token',
  'authToken',
  'accessToken'
];

/**
 * 从配置中移除或遮蔽敏感信息
 */
export const sanitizeConfig = (config: any): any => {
  const sanitized = JSON.parse(JSON.stringify(config));

  const sanitizeObject = (obj: any): void => {
    if (!obj || typeof obj !== 'object') return;

    for (const key of Object.keys(obj)) {
      if (SENSITIVE_FIELDS.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object') {
        sanitizeObject(obj[key]);
      }
    }
  };

  sanitizeObject(sanitized);
  return sanitized;
};

/**
 * 检查配置是否包含敏感信息
 */
export const containsSensitiveInfo = (config: any): boolean => {
  const json = JSON.stringify(config).toLowerCase();
  return SENSITIVE_FIELDS.some(field => json.includes(field.toLowerCase()));
};
```

### 安全措施

| 措施 | 描述 |
|------|------|
| 敏感信息遮蔽 | 日志和UI中不显示API keys、tokens等 |
| 配置文件权限 | 仅应用可读写，不设置全局可写权限 |
| 备份安全 | 备份文件同权限管理，清理时彻底删除 |
| IPC通信 | 敏感操作需要主进程验证 |

---

## 备份策略

```typescript
// src/main/services/BackupService.ts

export interface BackupInfo {
  id: string;
  ideType: string;
  timestamp: number;
  path: string;
  size: number;
}

export class BackupService {
  private backupDir: string;
  private maxBackups: number = 10;

  constructor() {
    this.backupDir = path.join(os.homedir(), '.mcp-switch', 'backup');
  }

  /**
   * 创建备份
   */
  async createBackup(ideType: string, content: string): Promise<BackupInfo> {
    await fs.promises.mkdir(this.backupDir, { recursive: true });

    const timestamp = Date.now();
    const filename = `${ideType}_${timestamp}.backup`;
    const filepath = path.join(this.backupDir, filename);

    await fs.promises.writeFile(filepath, content, 'utf-8');

    const info: BackupInfo = {
      id: filename,
      ideType,
      timestamp,
      path: filepath,
      size: Buffer.byteLength(content, 'utf-8')
    };

    await this.cleanupOldBackups(ideType);
    return info;
  }

  /**
    * 清理旧备份
    * 使用更安全的解析方式：从末尾查找最后一个下划线来分隔 ideType 和 timestamp
    */
  private async cleanupOldBackups(ideType: string): Promise<void> {
    const files = await fs.promises.readdir(this.backupDir);
    const backups = files
      .filter(f => f.startsWith(ideType + '_') && f.endsWith('.backup'))
      .map(f => {
        // 从文件名末尾解析 timestamp，避免 ideType 包含下划线时解析错误
        // 文件名格式: ideType_timestamp.backup
        const withoutExt = f.slice(0, -'.backup'.length);
        const lastUnderscoreIndex = withoutExt.lastIndexOf('_');
        if (lastUnderscoreIndex === -1) return null;

        const timestamp = parseInt(withoutExt.slice(lastUnderscoreIndex + 1), 10);
        if (isNaN(timestamp)) return null;

        return { name: f, timestamp };
      })
      .filter((b): b is { name: string; timestamp: number } => b !== null)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(this.maxBackups);

    for (const backup of backups) {
      await fs.promises.unlink(path.join(this.backupDir, backup.name));
    }
  }

  /**
   * 恢复备份
   */
  async restoreBackup(backupId: string): Promise<string> {
    const filepath = path.join(this.backupDir, backupId);
    return fs.promises.readFile(filepath, 'utf-8');
  }

  /**
    * 获取所有备份列表
    * 使用更安全的解析方式：从末尾查找最后一个下划线来分隔 ideType 和 timestamp
    */
  async listBackups(ideType?: string): Promise<BackupInfo[]> {
    const files = await fs.promises.readdir(this.backupDir);
    const backups: BackupInfo[] = [];

    for (const filename of files) {
      if (!filename.endsWith('.backup')) continue;

      // 从文件名末尾解析，避免 ideType 包含下划线时解析错误
      const withoutExt = filename.slice(0, -'.backup'.length);
      const lastUnderscoreIndex = withoutExt.lastIndexOf('_');
      if (lastUnderscoreIndex === -1) continue;

      const type = withoutExt.slice(0, lastUnderscoreIndex);
      const timestampStr = withoutExt.slice(lastUnderscoreIndex + 1);
      const timestamp = parseInt(timestampStr, 10);

      if (isNaN(timestamp)) continue;
      if (ideType && type !== ideType) continue;

      const filepath = path.join(this.backupDir, filename);
      const stats = await fs.promises.stat(filepath);

      backups.push({
        id: filename,
        ideType: type,
        timestamp,
        path: filepath,
        size: stats.size
      });
    }

    return backups.sort((a, b) => b.timestamp - a.timestamp);
  }
}
```

### 备份规则

| 规则 | 描述 |
|------|------|
| 自动备份 | 每次同步前自动创建 |
| 手动备份 | 用户可触发手动备份 |
| 保留数量 | 最多保留 10 个版本 |
| 备份位置 | `~/.mcp-switch/backup/` |
| 恢复功能 | 支持回滚到任意备份 |

---

## 更新机制

```typescript
// src/main/services/ConfigWatcher.ts
import * as fs from 'fs';
import * as path from 'path';

export class ConfigWatcher {
  private watchers: Map<string, fs.FSWatcher> = new Map();
  private debounceMs: number = 300;
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();

  /**
    * 监听配置文件变化
    * 策略：监听配置文件所在的目录，而不是文件本身，避免文件不存在时监听失败
    */
  watchConfig(ideType: string, configPath: string, callback: (event: string, ideType: string) => void): void {
    // 清理现有的监听器和定时器
    this.unwatchConfig(configPath);

    try {
      const configDir = path.dirname(configPath);
      const configFilename = path.basename(configPath);

      // 确保目录存在（如果不存在则创建）
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      // 监听目录而不是文件，这样可以处理文件不存在的情况
      const watcher = fs.watch(configDir, { persistent: true }, (eventType, filename) => {
        // 只处理目标配置文件的变化
        if (filename !== configFilename) {
          return;
        }

        // Debounce 处理
        const timerKey = `${configPath}_${eventType || 'change'}`;
        if (this.debounceTimers.has(timerKey)) {
          clearTimeout(this.debounceTimers.get(timerKey)!);
        }

        const timer = setTimeout(() => {
          this.debounceTimers.delete(timerKey);
          callback(eventType || 'change', ideType);
        }, this.debounceMs);

        this.debounceTimers.set(timerKey, timer);
      });

      this.watchers.set(configPath, watcher);
    } catch (error) {
      console.error(`Failed to watch config file: ${configPath}`, error);
      // 可选：通知前端监听失败
    }
  }

  /**
    * 停止监听
    */
  unwatchConfig(configPath: string): void {
    // 清除相关的 debounce 定时器
    for (const [key, timer] of this.debounceTimers.entries()) {
      if (key.startsWith(configPath)) {
        clearTimeout(timer);
        this.debounceTimers.delete(key);
      }
    }

    // 关闭文件监听器
    const watcher = this.watchers.get(configPath);
    if (watcher) {
      try {
        watcher.close();
      } catch (error) {
        console.error(`Error closing watcher for: ${configPath}`, error);
      }
      this.watchers.delete(configPath);
    }
  }

  /**
    * 关闭所有监听器
    */
  closeAll(): void {
    for (const configPath of this.watchers.keys()) {
      this.unwatchConfig(configPath);
    }
  }

  /**
    * 手动刷新配置（当检测到外部修改时）
    */
  async refreshConfig(ideType: string, configPath: string): Promise<RefreshResult> {
    try {
      // 1. 检查文件是否存在
      if (!fs.existsSync(configPath)) {
        return {
          success: false,
          error: 'CONFIG_NOT_FOUND',
          message: `配置文件不存在: ${configPath}`
        };
      }

      // 2. 读取并解析配置文件
      const content = await fs.promises.readFile(configPath, 'utf-8');
      const config = configParsers[ideType](content);

      // 3. 验证配置完整性
      const integrityCheck = await checkConfigIntegrity(ideType, content);
      if (integrityCheck.isCorrupted) {
        return {
          success: false,
          error: 'CONFIG_CORRUPTED',
          message: integrityCheck.suggestion || '配置文件已损坏'
        };
      }

      // 4. 通过 IPC 通知前端更新状态
      // mainWindow.webContents.send('config:updated', { ideType, config });

      return {
        success: true,
        config,
        serversCount: Object.keys(config.mcpServers || {}).length
      };
    } catch (error: any) {
      return {
        success: false,
        error: 'REFRESH_FAILED',
        message: error.message
      };
    }
  }
}

interface RefreshResult {
  success: boolean;
  config?: any;
  serversCount?: number;
  error?: string;
  message?: string;
}
```

### 更新检测策略

| 场景 | 处理方式 |
|------|----------|
| 用户手动修改配置文件 | 检测到变化后提示用户刷新 |
| 外部应用修改配置 | 自动检测并提示同步 |
| 配置格式损坏 | 尝试恢复上一次有效配置 |
| 检测到冲突 | 提示用户解决后重新同步 |

---

## 测试计划

### 一键测试命令

> **重要**: 在 `package.json` 中配置以下测试脚本，支持一键运行所有测试。

```json
{
  "scripts": {
    "test": "npm run test:unit && npm run test:integration && npm run test:e2e",
    "test:unit": "vitest run --coverage",
    "test:unit:watch": "vitest",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:coverage": "vitest run --coverage --reporter=html",
    "typecheck": "tsc --noEmit"
  }
}
```

#### 快速验证命令
```bash
# 一键运行所有测试（开发完成后必须通过）
npm test

# 仅运行单元测试（开发过程中频繁使用）
npm run test:unit

# 运行单元测试并监听文件变化
npm run test:unit:watch

# 运行集成测试
npm run test:integration

# 运行 E2E 测试（需要先构建应用）
npm run build && npm run test:e2e

# 生成测试覆盖率报告
npm run test:coverage

# TypeScript 类型检查
npm run typecheck
```

---

### 测试策略

| 测试类型 | 覆盖率目标 | 工具 | 说明 |
|----------|------------|------|------|
| 单元测试 | ≥ 80% | Vitest | 测试独立函数和类 |
| 集成测试 | ≥ 60% | Vitest | 测试模块间协作 |
| E2E 测试 | 核心流程 100% | Playwright | 测试完整用户流程 |

---

### Vitest 配置

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/main/**/*.ts'],
      exclude: ['src/main/index.ts', '**/*.d.ts'],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    setupFiles: ['tests/helpers/setup.ts']
  },
  resolve: {
    alias: {
      '@main': path.resolve(__dirname, 'src/main'),
      '@shared': path.resolve(__dirname, 'src/shared')
    }
  }
});
```

```typescript
// vitest.integration.config.ts
import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from './vitest.config';

export default mergeConfig(baseConfig, defineConfig({
  test: {
    include: ['tests/integration/**/*.test.ts'],
    testTimeout: 30000,
    hookTimeout: 30000
  }
}));
```

---

### Playwright 配置

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  expect: {
    timeout: 10000
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['html', { open: 'never' }],
    ['list']
  ],
  use: {
    actionTimeout: 10000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  }
});
```

---

### 测试辅助工具

```typescript
// tests/helpers/setup.ts
import { beforeAll, afterAll, vi } from 'vitest';

// Mock electron
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn((name: string) => `/mock/path/${name}`),
    getName: vi.fn(() => 'MCP Switch'),
    getVersion: vi.fn(() => '1.0.0')
  },
  ipcMain: {
    handle: vi.fn(),
    on: vi.fn()
  }
}));

// 设置测试环境变量
beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.HOME = '/mock/home';
  process.env.USERPROFILE = 'C:\\mock\\users\\test';
  process.env.APPDATA = 'C:\\mock\\appdata';
});

afterAll(() => {
  vi.restoreAllMocks();
});
```

```typescript
// tests/helpers/mockFs.ts
import { vol } from 'memfs';
import { vi } from 'vitest';

/**
 * 创建虚拟文件系统用于测试
 */
export const createMockFs = (files: Record<string, string>) => {
  vol.reset();
  vol.fromJSON(files, '/');

  // Mock fs module
  vi.mock('fs', async () => {
    const memfs = await import('memfs');
    return memfs.fs;
  });

  vi.mock('fs/promises', async () => {
    const memfs = await import('memfs');
    return memfs.fs.promises;
  });
};

export const resetMockFs = () => {
  vol.reset();
  vi.restoreAllMocks();
};
```

---

### 测试用例规范

#### 单元测试示例

```typescript
// tests/unit/utils/configParser.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { parseJSON, parseTOML, parseJSONC, deepMerge } from '@main/utils/configParser';

describe('configParser', () => {
  describe('parseJSON', () => {
    it('should parse valid JSON config', () => {
      const config = '{"mcpServers": {"test": {"command": "node"}}}';
      const result = parseJSON(config);
      expect(result.mcpServers.test.command).toBe('node');
    });

    it('should throw ConfigError on invalid JSON', () => {
      const config = '{invalid json}';
      expect(() => parseJSON(config)).toThrow();
    });

    it('should handle empty mcpServers object', () => {
      const config = '{"mcpServers": {}}';
      const result = parseJSON(config);
      expect(result.mcpServers).toEqual({});
    });
  });

  describe('parseTOML', () => {
    it('should parse valid TOML config', () => {
      const config = `
[mcpServers.test]
command = "node"
args = ["index.js"]
`;
      const result = parseTOML(config);
      expect(result.mcpServers.test.command).toBe('node');
      expect(result.mcpServers.test.args).toEqual(['index.js']);
    });
  });

  describe('parseJSONC', () => {
    it('should parse JSONC with comments', () => {
      const config = `{
  // This is a comment
  "mcpServers": {
    "test": {
      "command": "node" /* inline comment */
    }
  }
}`;
      const result = parseJSONC(config);
      expect(result.mcpServers.test.command).toBe('node');
    });

    it('should handle trailing commas', () => {
      const config = '{"mcpServers": {"test": {"command": "node",}},}';
      const result = parseJSONC(config);
      expect(result.mcpServers.test.command).toBe('node');
    });
  });

  describe('deepMerge', () => {
    it('should merge objects recursively', () => {
      const result = deepMerge(
        { a: 1, b: { c: 2 } },
        { b: { d: 3 }, e: 4 }
      );
      expect(result).toEqual({ a: 1, b: { c: 2, d: 3 }, e: 4 });
    });

    it('should merge arrays with deduplication', () => {
      const result = deepMerge(
        { arr: ['a', 'b'] },
        { arr: ['b', 'c'] }
      );
      expect(result.arr).toEqual(['a', 'b', 'c']);
    });

    it('should override primitive values', () => {
      const result = deepMerge({ a: 1 }, { a: 2 });
      expect(result.a).toBe(2);
    });
  });
});
```

#### 集成测试示例

```typescript
// tests/integration/sync.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMockFs, resetMockFs } from '../helpers/mockFs';
import { ConfigService } from '@main/services/ConfigService';
import { SyncConflictResolver } from '@main/services/SyncConflictResolver';
import { BackupService } from '@main/services/BackupService';

describe('Sync Integration', () => {
  let configService: ConfigService;
  let syncResolver: SyncConflictResolver;
  let backupService: BackupService;

  beforeEach(() => {
    // 创建测试用的虚拟文件系统
    createMockFs({
      '/home/.config/Claude/claude_desktop_config.json': JSON.stringify({
        mcpServers: {
          'server-a': { command: 'npx', args: ['server-a'] },
          'server-b': { command: 'npx', args: ['server-b'] }
        }
      }),
      '/home/.cursor/mcp.json': JSON.stringify({
        mcpServers: {
          'server-a': { command: 'npx', args: ['server-a-old'] }
        }
      })
    });

    configService = new ConfigService();
    syncResolver = new SyncConflictResolver();
    backupService = new BackupService();
  });

  afterEach(() => {
    resetMockFs();
  });

  it('should sync configs from Claude Desktop to Cursor', async () => {
    const sourceConfig = await configService.loadConfig('claude-desktop');
    const targetConfig = await configService.loadConfig('cursor');

    // 检测冲突
    const conflicts = syncResolver.detectConflicts(sourceConfig, targetConfig);
    expect(conflicts.length).toBeGreaterThan(0);

    // 执行同步（使用覆盖策略）
    const mergedConfig = syncResolver.resolveConflicts(
      sourceConfig,
      targetConfig,
      'overwrite'
    );

    // 保存配置
    await configService.saveConfig('cursor', mergedConfig);

    // 验证结果
    const updatedConfig = await configService.loadConfig('cursor');
    expect(updatedConfig.servers).toHaveLength(2);
  });

  it('should create backup before sync', async () => {
    const targetConfig = await configService.loadConfig('cursor');

    // 创建备份
    const backup = await backupService.createBackup(
      'cursor',
      JSON.stringify(targetConfig)
    );

    expect(backup.ideType).toBe('cursor');
    expect(backup.path).toContain('.mcp-switch/backup');
  });
});
```

#### E2E 测试示例

```typescript
// tests/e2e/sync-flow.spec.ts
import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { _electron as electron } from 'playwright';
import path from 'path';

let electronApp: ElectronApplication;
let page: Page;

test.beforeAll(async () => {
  electronApp = await electron.launch({
    args: [path.join(__dirname, '../../dist/main/index.js')],
    env: {
      ...process.env,
      NODE_ENV: 'test'
    }
  });
  page = await electronApp.firstWindow();
});

test.afterAll(async () => {
  await electronApp.close();
});

test.describe('Sync Flow', () => {
  test('should display all detected IDEs', async () => {
    // 等待 IDE 列表加载
    await page.waitForSelector('[data-testid="ide-list"]');

    // 验证至少显示一个 IDE
    const ideCards = await page.$$('[data-testid="ide-card"]');
    expect(ideCards.length).toBeGreaterThan(0);
  });

  test('should complete sync without conflicts', async () => {
    // 1. 选择源 IDE
    await page.click('[data-testid="ide-card-claude-desktop"]');
    await page.click('[data-testid="set-as-source"]');

    // 2. 选择目标 IDE
    await page.click('[data-testid="ide-card-cursor"]');
    await page.click('[data-testid="add-to-targets"]');

    // 3. 打开同步面板
    await page.click('[data-testid="sync-button"]');

    // 4. 预览变更
    await page.waitForSelector('[data-testid="sync-preview"]');
    const previewItems = await page.$$('[data-testid="sync-preview-item"]');
    expect(previewItems.length).toBeGreaterThan(0);

    // 5. 执行同步
    await page.click('[data-testid="confirm-sync"]');

    // 6. 验证成功提示
    await page.waitForSelector('[data-testid="sync-success"]');
    const successMessage = await page.textContent('[data-testid="sync-success"]');
    expect(successMessage).toContain('同步完成');
  });

  test('should handle sync conflicts', async () => {
    // 准备冲突场景...

    // 执行同步
    await page.click('[data-testid="sync-button"]');

    // 验证冲突解决 UI 显示
    await page.waitForSelector('[data-testid="conflict-resolver"]');

    // 选择解决策略
    await page.click('[data-testid="strategy-keep-source"]');
    await page.click('[data-testid="apply-resolution"]');

    // 验证结果
    await page.waitForSelector('[data-testid="sync-success"]');
  });
});
```

---

### 测试数据 (Fixtures)

```json
// tests/fixtures/configs/claude-desktop.json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-filesystem"],
      "env": {
        "ALLOWED_PATHS": "/home/user/projects"
      }
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-github"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
```

```toml
# tests/fixtures/configs/codex.toml
[mcpServers.filesystem]
command = "npx"
args = ["-y", "@anthropic/mcp-server-filesystem"]

[mcpServers.filesystem.env]
ALLOWED_PATHS = "/home/user/projects"
```

```json
// tests/fixtures/corrupted/invalid-json.json
{
  "mcpServers": {
    "test": {
      "command": "node"
      // missing closing braces
```

---

### 各阶段测试验收清单

| Phase | 测试命令 | 通过标准 |
|-------|----------|----------|
| Phase 1 | `npm run dev && npm run build` | 应用启动无错误，构建成功 |
| Phase 2 | `npm run typecheck` | TypeScript 类型检查通过 |
| Phase 3 | `npm run test:unit -- --grep "utils\|adapters"` | 覆盖率 ≥ 90% |
| Phase 4 | `npm run test:unit -- --grep "services" && npm run test:integration` | 覆盖率 ≥ 80% |
| Phase 5 | `npm run test:unit -- --grep "components\|stores"` | 组件渲染无错误 |
| Phase 6 | `npm run test:integration -- --grep "tray\|import\|export"` | 功能测试通过 |
| Phase 7 | `npm test && npm run package` | 所有测试通过，打包成功 |

---

### CI/CD 集成

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node-version: [18, 20]

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: TypeScript check
        run: npm run typecheck

      - name: Unit tests
        run: npm run test:unit

      - name: Integration tests
        run: npm run test:integration

      - name: Build
        run: npm run build

      - name: E2E tests
        run: npm run test:e2e

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

---

## 关键文件清单

| 文件 | 用途 |
|------|------|
| `src/main/adapters/BaseAdapter.ts` | 适配器基类 |
| `src/main/services/ConfigService.ts` | 核心配置服务 |
| `src/main/services/SyncConflictResolver.ts` | 冲突解决器 |
| `src/main/services/BackupService.ts` | 备份服务 |
| `src/main/services/ConfigWatcher.ts` | 文件监听服务 |
| `src/main/ipc/config.handlers.ts` | IPC处理器 |
| `src/main/utils/errors.ts` | 错误码定义 |
| `src/main/utils/envExpander.ts` | 环境变量扩展 |
| `src/renderer/stores/useConfigStore.ts` | 状态管理 |
| `src/renderer/components/sync/SyncPanel.tsx` | 同步面板UI |
| `src/renderer/components/server/ServerCard.tsx` | 服务器卡片UI |
| `src/renderer/components/conflict/ConflictResolver.tsx` | 冲突解决UI |
