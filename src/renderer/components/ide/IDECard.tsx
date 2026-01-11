import React from 'react';
import { IDEConfig } from '../../types/mcp';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Laptop, Terminal, Code2, Sparkles, Box, Server, Settings2 } from 'lucide-react';
import { useConfigStore } from '../../stores/useConfigStore';

const IDE_ICONS: Record<string, React.ReactNode> = {
  'claude-desktop': <Laptop className="h-6 w-6" />,
  'claude-code': <Terminal className="h-6 w-6" />,
  'cursor': <Code2 className="h-6 w-6" />,
  'windsurf': <Sparkles className="h-6 w-6" />,
  'codex': <Box className="h-6 w-6" />,
  'opencode': <Server className="h-6 w-6" />,
};

interface IDECardProps {
  config: IDEConfig;
  onSelect?: () => void;
  showManageButton?: boolean;
}

export const IDECard: React.FC<IDECardProps> = ({ config, onSelect, showManageButton = true }) => {
  const { selectIDE } = useConfigStore();

  const handleManage = () => {
    selectIDE(config.type);
    if (onSelect) onSelect();
  };

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardHeader className="flex flex-row items-center gap-4">
        <div className="p-2 bg-primary/10 rounded-lg text-primary">
            {IDE_ICONS[config.type]}
        </div>
        <div className="flex-1">
            <CardTitle className="text-lg">{config.displayName}</CardTitle>
            <CardDescription className="text-xs truncate" title={config.configPath}>
                {config.configPath || 'Configuration path not detected'}
            </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Servers Configured</span>
            <span className="font-medium bg-secondary px-2 py-0.5 rounded-md">
                {config.servers.length}
            </span>
        </div>
        <div className="flex justify-between items-center text-sm mt-2">
             <span className="text-muted-foreground">Status</span>
             {config.isInstalled ? (
                 <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Installed</Badge>
             ) : (
                 <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">Not Detected</Badge>
             )}
        </div>
      </CardContent>
      {showManageButton && (
        <CardFooter>
            <Button variant="outline" className="w-full" onClick={handleManage}>
                <Settings2 className="mr-2 h-4 w-4" /> Manage
            </Button>
        </CardFooter>
      )}
    </Card>
  );
};
