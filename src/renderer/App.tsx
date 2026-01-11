import React from 'react';
import { MainLayout } from './components/layout/MainLayout';
import { IDEList } from './components/ide/IDEList';
import { ServerList } from './components/server/ServerList';
import { SyncPanel } from './components/sync/SyncPanel';
import { ConflictResolver } from './components/conflict/ConflictResolver';
import { useConfigStore } from './stores/useConfigStore';
import { useSyncStore } from './stores/useSyncStore';
import { useIPC } from './hooks/useIPC';
import { Button } from './components/ui/button';
import { ArrowLeft } from 'lucide-react';

const App: React.FC = () => {
  const { isReady } = useIPC();
  const { selectedIDE, selectIDE, configs } = useConfigStore();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { conflicts } = useSyncStore();
  const [activeView, setActiveView] = React.useState<'dashboard' | 'sync'>('dashboard');

  if (!isReady) {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-foreground">
        <div className="flex flex-col items-center gap-4">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            <p className="text-muted-foreground">Connecting to MCP Switch Core...</p>
        </div>
      </div>
    );
  }

  // Find the config object for the selected IDE
  const selectedConfig = configs.find(c => c.type === selectedIDE);

  return (
    <MainLayout>
      {/* Navigation / View Switcher */}
      <div className="mb-6 flex gap-2 border-b pb-2">
           <Button
               variant={activeView === 'dashboard' ? 'default' : 'ghost'}
               onClick={() => setActiveView('dashboard')}
               className="h-8"
           >
               Dashboard
           </Button>
           <Button
               variant={activeView === 'sync' ? 'default' : 'ghost'}
               onClick={() => setActiveView('sync')}
               className="h-8"
           >
               Sync
           </Button>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {activeView === 'dashboard' && (
            <>
                {selectedIDE ? (
                    <div className="space-y-6">
                        <Button
                            variant="ghost"
                            className="pl-0 hover:bg-transparent"
                            onClick={() => selectIDE(null as any)}
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Overview
                        </Button>

                        {selectedConfig ? (
                             <ServerList
                                servers={selectedConfig.servers}
                                ideType={selectedIDE}
                             />
                        ) : (
                            <div>Configuration not found</div>
                        )}
                    </div>
                ) : (
                    <IDEList />
                )}
            </>
        )}

        {activeView === 'sync' && (
            <SyncPanel />
        )}
      </div>

      <ConflictResolver />
    </MainLayout>
  );
};

export default App;
