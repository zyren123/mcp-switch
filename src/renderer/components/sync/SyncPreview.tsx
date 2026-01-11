import React from 'react';
import { SyncPreviewItem, IDEType } from '../../types/mcp';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { ArrowRight, Plus, Trash2, RefreshCw, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SyncPreviewProps {
  items: SyncPreviewItem[];
  sourceIDE: IDEType | null;
  targetIDEs: IDEType[];
}

export const SyncPreview: React.FC<SyncPreviewProps> = ({ items, sourceIDE, targetIDEs }) => {
  if (!sourceIDE || targetIDEs.length === 0) return null;

  const getActionIcon = (action: SyncPreviewItem['action']) => {
    switch (action) {
      case 'add': return <Plus className="h-4 w-4 text-green-500" />;
      case 'remove': return <Trash2 className="h-4 w-4 text-red-500" />;
      case 'update': return <RefreshCw className="h-4 w-4 text-blue-500" />;
      default: return null;
    }
  };

  const getActionColor = (action: SyncPreviewItem['action']) => {
      switch (action) {
          case 'add': return 'bg-green-500/10 border-green-500/20';
          case 'remove': return 'bg-red-500/10 border-red-500/20';
          case 'update': return 'bg-blue-500/10 border-blue-500/20';
          default: return 'bg-muted';
      }
  };

  return (
    <Card className="mt-6 border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
            Preview Changes
            <Badge variant="secondary" className="font-normal text-xs">
                {items.length} changes
            </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-3">
                {items.map((item, index) => (
                    <div
                        key={`${item.serverId}-${index}`}
                        className={cn(
                            "flex items-center justify-between p-3 rounded-md border",
                            getActionColor(item.action)
                        )}
                        data-testid="sync-preview-item"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-background rounded-full border shadow-sm">
                                {getActionIcon(item.action)}
                            </div>
                            <div>
                                <div className="font-medium flex items-center gap-2">
                                    {item.serverName}
                                    {item.hasConflict && (
                                        <Badge variant="destructive" className="text-[10px] px-1 h-5 flex gap-1">
                                            <AlertTriangle className="h-3 w-3" /> Conflict
                                        </Badge>
                                    )}
                                </div>
                                <div className="text-xs text-muted-foreground font-mono">
                                    {item.serverId}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="capitalize text-foreground font-medium">{item.action}</span>
                            <div className="flex items-center gap-2 px-2 py-1 bg-background/50 rounded border">
                                <span className="capitalize">{sourceIDE?.replace('-', ' ')}</span>
                                <ArrowRight className="h-3 w-3" />
                                <span className="font-medium text-foreground">
                                    {targetIDEs.map(t => t.replace('-', ' ')).join(', ')}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
                {items.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                        No changes detected. Configurations are in sync.
                    </div>
                )}
            </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
