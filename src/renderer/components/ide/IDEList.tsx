import React from 'react';
import { IDECard } from './IDECard';
import { useConfigStore } from '../../stores/useConfigStore';
import { useSyncStore } from '../../stores/useSyncStore';
import { ArrowRightLeft } from 'lucide-react';
import { Button } from '../ui/button';

export const IDEList: React.FC = () => {
  const { configs, isLoading } = useConfigStore();
  const { setSource } = useSyncStore();

  // This component acts as a dashboard or overview
  // We can also trigger the Sync flow from here

  // If we want to navigate to sync, we might need a way to change "active view" in App.tsx
  // For now, let's just assume this is the Dashboard view.

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
          <div>
              <h2 className="text-3xl font-bold tracking-tight">Overview</h2>
              <p className="text-muted-foreground mt-2">
                  Manage your MCP configurations across all supported development tools.
              </p>
          </div>
          {/* We'll handle Sync navigation in App.tsx or Sidebar usually, but could have a CTA here */}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {configs.map((config) => (
          <IDECard key={config.type} config={config} />
        ))}
      </div>

      {isLoading && configs.length === 0 && (
          <div className="flex justify-center p-12">
              <span className="loading loading-spinner loading-lg">Loading configurations...</span>
          </div>
      )}
    </div>
  );
};
