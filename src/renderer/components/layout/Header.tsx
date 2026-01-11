import React from 'react';
import { useConfigStore } from '../../stores/useConfigStore';
import { RefreshCw, Settings, Menu } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip"

export const Header: React.FC = () => {
  const { selectedIDE, refreshConfig, isLoading } = useConfigStore();

  const handleRefresh = () => {
    if (selectedIDE) {
      refreshConfig(selectedIDE);
    }
  };

  return (
    <header className="h-14 border-b border-border bg-card/50 px-4 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-2 md:hidden">
        <Button variant="ghost" size="icon" className="-ml-2">
            <Menu className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold tracking-tight">
          {selectedIDE ? (
             <span className="capitalize">{selectedIDE.replace(/-/g, ' ')}</span>
          ) : (
            'Dashboard'
          )}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleRefresh}
                        disabled={!selectedIDE || isLoading}
                        className={isLoading ? "animate-spin" : ""}
                    >
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Refresh Configuration</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>

        <Button variant="ghost" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
};
