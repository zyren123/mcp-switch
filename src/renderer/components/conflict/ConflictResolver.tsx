import React, { useEffect } from 'react';
import { useSyncStore } from '../../stores/useSyncStore';
import { ConflictItem } from './ConflictItem';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog"
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

export const ConflictResolver: React.FC = () => {
  const { conflicts, executeSync, syncStatus, resetSync } = useSyncStore();
  const [resolutions, setResolutions] = React.useState<Record<string, any>>({});
  const [isOpen, setIsOpen] = React.useState(false);

  useEffect(() => {
    if (conflicts.length > 0) {
      setIsOpen(true);
    }
  }, [conflicts]);

  const handleResolve = (conflictIndex: number, resolution: string) => {
    // We map conflict index to resolution since we don't have unique conflict IDs
    // Or we assume sequential resolution.
    // The executeSync expects resolutions array matching conflicts?
    // Spec says: execute: (..., resolutions?: any[])
    // Let's build an array of resolutions.

    setResolutions(prev => ({
        ...prev,
        [conflictIndex]: {
            ...conflicts[conflictIndex],
            choice: resolution
        }
    }));
  };

  const handleApply = async () => {
      // Check if all conflicts resolved
      if (Object.keys(resolutions).length < conflicts.length) {
          return; // Show error or disable button
      }

      const resolutionList = conflicts.map((_, idx) => resolutions[idx]);
      // For manual resolution, we pass 'manual' strategy and the specific resolutions
      await executeSync('manual', resolutionList);
      setIsOpen(false);
  };

  const allResolved = conflicts.length > 0 && Object.keys(resolutions).length === conflicts.length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open && syncStatus !== 'completed') {
            // Confirm cancel?
            resetSync();
        }
        setIsOpen(open);
    }}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0" data-testid="conflict-resolver">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Sync Conflicts Detected
          </DialogTitle>
          <DialogDescription>
            Some configurations conflict with the target. Please choose which version to keep.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-4 bg-muted/20">
            <div className="space-y-4">
                {conflicts.map((conflict, index) => (
                    <ConflictItem
                        key={`${conflict.serverId}-${conflict.field}-${index}`}
                        conflict={conflict}
                        onResolve={(res) => handleResolve(index, res)}
                    />
                ))}
            </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t bg-background">
          <Button variant="outline" onClick={() => { setIsOpen(false); resetSync(); }}>Cancel Sync</Button>
          <Button
            onClick={handleApply}
            disabled={!allResolved}
            className="gap-2"
            data-testid="apply-resolution"
          >
              <CheckCircle2 className="h-4 w-4" />
              Apply Resolutions ({Object.keys(resolutions).length}/{conflicts.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
