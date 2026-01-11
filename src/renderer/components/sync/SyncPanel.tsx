import React from 'react';
import { useConfigStore } from '../../stores/useConfigStore';
import { useSyncStore } from '../../stores/useSyncStore';
import { IDEType } from '../../types/mcp';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ArrowRightLeft, ArrowRight, Loader2, CheckCircle } from 'lucide-react';
import { SyncPreview } from './SyncPreview';
import { cn } from '../../lib/utils';
import { Label } from '../ui/label';

interface SyncPanelProps {
    className?: string;
}

export const SyncPanel: React.FC<SyncPanelProps> = ({ className }) => {
  const { configs } = useConfigStore();
  const {
      sourceIDE,
      targetIDEs,
      setSource,
      toggleTarget,
      previewSync,
      executeSync,
      syncStatus,
      previewItems,
      resetSync,
      error
  } = useSyncStore();

  const [strategy, setStrategy] = React.useState('overwrite');

  const handlePreview = () => {
      previewSync();
  };

  const handleSync = () => {
      executeSync(strategy);
  };

  const availableIDEs = configs.map(c => c.type);

  if (syncStatus === 'completed') {
      return (
          <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-6 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-green-800" data-testid="sync-success">Sync Completed Successfully</h3>
                  <p className="text-green-600 max-w-xs">
                      Configuration has been synchronized from <span className="font-semibold">{sourceIDE}</span> to targets.
                  </p>
                  <Button variant="outline" onClick={resetSync} className="mt-2 border-green-200 text-green-700 hover:bg-green-100">
                      Done
                  </Button>
              </CardContent>
          </Card>
      )
  }

  return (
    <div className={cn("space-y-6", className)}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-primary" />
              Sync Configurations
          </CardTitle>
          <CardDescription>
            Synchronize MCP servers between different IDEs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                {/* Source Selection */}
                <div className="space-y-3">
                    <Label className="text-base font-semibold">Source (From)</Label>
                    <div className="grid gap-2">
                        {configs.map(ide => (
                            <div
                                key={`source-${ide.type}`}
                                className={cn(
                                    "flex items-center justify-between p-3 rounded-md border cursor-pointer transition-all hover:bg-muted",
                                    sourceIDE === ide.type ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-input"
                                )}
                                onClick={() => setSource(ide.type)}
                                data-testid={`ide-card-${ide.type}`}
                            >
                                <span className="font-medium">{ide.displayName}</span>
                                {sourceIDE === ide.type && <div className="h-2 w-2 rounded-full bg-primary" />}
                            </div>
                        ))}
                    </div>
                     {sourceIDE && (
                        <div className="text-xs text-muted-foreground mt-1" data-testid="set-as-source">
                            Selected as source
                        </div>
                    )}
                </div>

                {/* Arrow */}
                <div className="hidden md:flex items-center justify-center h-full pt-8">
                    <ArrowRight className="h-6 w-6 text-muted-foreground" />
                </div>

                {/* Target Selection */}
                <div className="space-y-3">
                    <Label className="text-base font-semibold">Targets (To)</Label>
                     <div className="grid gap-2">
                        {configs.map(ide => {
                            const isSource = sourceIDE === ide.type;
                            const isSelected = targetIDEs.includes(ide.type);
                            return (
                                <div
                                    key={`target-${ide.type}`}
                                    className={cn(
                                        "flex items-center justify-between p-3 rounded-md border transition-all",
                                        isSource ? "opacity-50 cursor-not-allowed bg-muted" : "cursor-pointer hover:bg-muted",
                                        isSelected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-input"
                                    )}
                                    onClick={() => !isSource && toggleTarget(ide.type)}
                                    data-testid={isSelected ? `remove-target-${ide.type}` : `add-target-${ide.type}`}
                                >
                                    <span className="font-medium">{ide.displayName}</span>
                                    {isSelected && <div className="h-2 w-2 rounded-full bg-primary" />}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Strategy Selection */}
            {sourceIDE && targetIDEs.length > 0 && (
                 <div className="space-y-3 pt-4 border-t">
                    <Label className="text-base font-semibold">Sync Strategy</Label>
                    <div className="w-[300px]">
                        <Select value={strategy} onValueChange={setStrategy}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select strategy" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="overwrite">Overwrite Target (Replace all)</SelectItem>
                                <SelectItem value="merge">Merge (Add missing, update existing)</SelectItem>
                                <SelectItem value="keep-target">Keep Target (Only add missing)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4">
                {(previewItems.length > 0 || syncStatus === 'syncing') ? (
                     <Button
                        onClick={handleSync}
                        disabled={syncStatus === 'syncing'}
                        data-testid="confirm-sync"
                     >
                        {syncStatus === 'syncing' ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Syncing...
                            </>
                        ) : (
                            'Confirm & Sync'
                        )}
                    </Button>
                ) : (
                    <Button
                        onClick={handlePreview}
                        disabled={!sourceIDE || targetIDEs.length === 0 || syncStatus === 'previewing'}
                        data-testid="sync-button"
                    >
                         {syncStatus === 'previewing' ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Analyzing...
                            </>
                        ) : (
                            'Preview Changes'
                        )}
                    </Button>
                )}
            </div>

             {error && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                    {error}
                </div>
            )}
        </CardContent>
      </Card>

      {/* Preview Section */}
      {(previewItems.length > 0 || syncStatus === 'previewing') && (
          <div data-testid="sync-preview">
            <SyncPreview
                items={previewItems}
                sourceIDE={sourceIDE}
                targetIDEs={targetIDEs}
            />
          </div>
      )}
    </div>
  );
};
