import React from 'react';
import { SyncConflict } from '../../types/mcp';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Label } from '../ui/label';

// Simple Radio Group implementation if not available in ui/
// I'll assume standard HTML radio for now to avoid dependency on unimplemented component
// Or I can implement it quickly in the same file or assume it exists.
// Since I have Label, I'll use standard inputs styled with Tailwind.

interface ConflictItemProps {
  conflict: SyncConflict;
  onResolve: (resolution: 'keep-source' | 'keep-target') => void;
}

export const ConflictItem: React.FC<ConflictItemProps> = ({ conflict, onResolve }) => {
  const [choice, setChoice] = React.useState<'keep-source' | 'keep-target' | null>(null);

  const handleSelect = (value: 'keep-source' | 'keep-target') => {
    setChoice(value);
    onResolve(value);
  };

  const renderValue = (val: any) => {
    if (val === undefined) return <span className="text-muted-foreground italic">Missing</span>;
    if (typeof val === 'object') return <pre className="text-xs font-mono bg-muted p-2 rounded">{JSON.stringify(val, null, 2)}</pre>;
    return <span className="font-mono text-sm">{String(val)}</span>;
  };

  return (
    <Card className="border-l-4 border-l-amber-500">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono">{conflict.serverId}</Badge>
                <span className="text-sm text-muted-foreground">Conflict in field:</span>
                <Badge>{conflict.field}</Badge>
            </div>
            <Badge variant="secondary" className="capitalize">{conflict.conflictType.replace(/_/g, ' ')}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-4">
            {/* Source Option */}
            <div
                className={cn(
                    "p-4 rounded-lg border-2 cursor-pointer transition-all hover:bg-accent",
                    choice === 'keep-source' ? "border-primary bg-accent" : "border-border"
                )}
                onClick={() => handleSelect('keep-source')}
                data-testid="strategy-keep-source"
            >
                <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-sm">Source (New)</span>
                    {choice === 'keep-source' && <Check className="h-4 w-4 text-primary" />}
                </div>
                <div className="p-2 bg-background rounded border text-sm overflow-hidden">
                    {renderValue(conflict.sourceValue)}
                </div>
            </div>

            {/* Target Option */}
            <div
                className={cn(
                    "p-4 rounded-lg border-2 cursor-pointer transition-all hover:bg-accent",
                    choice === 'keep-target' ? "border-primary bg-accent" : "border-border"
                )}
                onClick={() => handleSelect('keep-target')}
            >
                <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-sm">Target (Current)</span>
                     {choice === 'keep-target' && <Check className="h-4 w-4 text-primary" />}
                </div>
                 <div className="p-2 bg-background rounded border text-sm overflow-hidden">
                    {renderValue(conflict.targetValue)}
                </div>
            </div>
        </div>
      </CardContent>
    </Card>
  );
};
