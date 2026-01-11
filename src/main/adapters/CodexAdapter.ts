import { IDEType, MCPServer } from '../../shared/types';
import { BaseAdapter, RawConfig, RawMCPServerConfig } from './BaseAdapter';

/**
 * Raw TOML config structure for Codex
 * TOML uses nested tables which require different handling
 */
interface CodexRawConfig {
  mcpServers?: Record<string, CodexServerConfig>;
  [key: string]: unknown;
}

interface CodexServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  disabled?: boolean;
}

/**
 * Adapter for Codex CLI (OpenAI)
 *
 * Config format: TOML (unique among supported IDEs)
 * Config path:
 *   - macOS: ~/.codex/config.toml
 *   - Windows: %USERPROFILE%\.codex\config.toml
 *   - Linux: ~/.codex/config.toml
 *
 * TOML structure example:
 * ```toml
 * [mcpServers.filesystem]
 * command = "npx"
 * args = ["-y", "@anthropic/mcp-server-filesystem"]
 *
 * [mcpServers.filesystem.env]
 * ALLOWED_PATHS = "/home/user/projects"
 * ```
 */
export class CodexAdapter extends BaseAdapter {
  readonly ideType: IDEType = 'codex';

  /**
   * Override normalizeServers to handle TOML structure
   */
  normalizeServers(rawConfig: RawConfig): MCPServer[] {
    const servers: MCPServer[] = [];
    const config = rawConfig as CodexRawConfig;
    const mcpServers = config.mcpServers || {};

    for (const [id, serverConfig] of Object.entries(mcpServers)) {
      servers.push({
        id,
        name: id,
        command: serverConfig.command,
        args: serverConfig.args || [],
        env: serverConfig.env,
        enabled: !serverConfig.disabled
      });
    }

    return servers;
  }

  /**
   * Override denormalizeServers to handle TOML structure
   */
  denormalizeServers(servers: MCPServer[]): Record<string, RawMCPServerConfig> {
    const mcpServers: Record<string, RawMCPServerConfig> = {};

    for (const server of servers) {
      const rawServer: RawMCPServerConfig = {
        command: server.command
      };

      // TOML handles arrays well
      if (server.args && server.args.length > 0) {
        rawServer.args = server.args;
      }

      // Env as nested table in TOML
      if (server.env && Object.keys(server.env).length > 0) {
        rawServer.env = server.env;
      }

      if (!server.enabled) {
        rawServer.disabled = true;
      }

      mcpServers[server.id] = rawServer;
    }

    return mcpServers;
  }
}
