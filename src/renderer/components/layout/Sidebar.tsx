import React, { useEffect } from 'react';
import { useConfigStore } from '../../stores/useConfigStore';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import {
  Laptop,
  Terminal,
  Code2,
  Sparkles,
  Box,
  Server,
  AlertCircle
} from 'lucide-react';
import { IDEType } from '../../types/mcp';

const IDE_ICONS: Record<IDEType, React.ReactNode> = {
  'claude-desktop': <Laptop className="h-4 w-4" />,
  'claude-code': <Terminal className="h-4 w-4" />,
  'cursor': <Code2 className="h-4 w-4" />,
  'windsurf': <Sparkles className="h-4 w-4" />,
  'codex': <Box className="h-4 w-4" />,
  'opencode': <Server className="h-4 w-4" />,
};

const IDE_LABELS: Record<IDEType, string> = {
    'claude-desktop': 'Claude Desktop',
    'claude-code': 'Claude Code',
    'cursor': 'Cursor',
    'windsurf': 'Windsurf',
    'codex': 'Codex CLI',
    'opencode': 'OpenCode',
};

export const Sidebar: React.FC = () => {
  const { configs, selectedIDE, selectIDE, loadConfigs, isLoading, error } = useConfigStore();

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  return (
    <aside className="w-64 border-r border-border bg-card/30 flex flex-col h-full hidden md:flex">
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center gap-2 font-bold text-xl text-primary">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                 <Server className="h-5 w-5 text-primary" />
            </div>
          MCP Switch
        </div>
      </div>

      <ScrollArea className="flex-1 py-4">
        <div className="px-3 space-y-1">
          <h2 className="mb-2 px-4 text-xs font-semibold tracking-tight text-muted-foreground uppercase">
            Detected IDEs
          </h2>

          {isLoading && configs.length === 0 && (
             <div className="px-4 py-2 text-sm text-muted-foreground">Loading...</div>
          )}

          {error && (
            <div className="px-4 py-2 text-sm text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Error loading config
            </div>
          )}

          {configs.map((config) => (
            <Button
              key={config.type}
              variant={selectedIDE === config.type ? 'secondary' : 'ghost'}
              className={cn(
                "w-full justify-start font-normal",
                selectedIDE === config.type && "bg-secondary/50 font-medium"
              )}
              onClick={() => selectIDE(config.type)}
            >
              <span className="mr-2 text-muted-foreground group-hover:text-foreground">
                {IDE_ICONS[config.type]}
              </span>
              {IDE_LABELS[config.type]}
              {config.servers.length > 0 && (
                <span className="ml-auto text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                    {config.servers.length}
                </span>
              )}
            </Button>
          ))}

          {!isLoading && configs.length === 0 && !error && (
              <div className="px-4 py-2 text-sm text-muted-foreground">No IDEs detected</div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border/50">
          <div className="text-xs text-center text-muted-foreground">
              v1.0.0
          </div>
      </div>
    </aside>
  );
};
