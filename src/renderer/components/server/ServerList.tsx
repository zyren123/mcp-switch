import React from 'react';
import { ServerCard } from './ServerCard';
import { MCPServer, IDEType } from '../../types/mcp';
import { Button } from '../ui/button';
import { Plus } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "../ui/dialog"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { useConfigStore } from '../../stores/useConfigStore';
import { toast } from "../ui/use-toast"

interface ServerListProps {
  servers: MCPServer[];
  ideType: IDEType;
}

export const ServerList: React.FC<ServerListProps> = ({ servers, ideType }) => {
  const { addServer } = useConfigStore();
  const [isAdding, setIsAdding] = React.useState(false);
  const [newServer, setNewServer] = React.useState({
      name: '',
      command: '',
      args: '',
      env: '{}'
  });

  const handleAddServer = async () => {
      if(!newServer.name || !newServer.command) {
          toast({
              variant: "destructive",
              title: "Missing Fields",
              description: "Name and Command are required.",
          });
          return;
      }

      try {
          const args = newServer.args.split(' ').filter(a => a.length > 0);
          let env = {};
          try {
              env = JSON.parse(newServer.env);
          } catch (e) {
              toast({
                  variant: "destructive",
                  title: "Invalid JSON",
                  description: "Environment variables must be valid JSON.",
              });
              return;
          }

          await addServer(ideType, {
              id: newServer.name.toLowerCase().replace(/\s+/g, '-'), // Simple ID generation
              name: newServer.name,
              command: newServer.command,
              args,
              env,
              enabled: true
          });

          setIsAdding(false);
          setNewServer({ name: '', command: '', args: '', env: '{}' });
          toast({
              title: "Server Added",
              description: `${newServer.name} added successfully.`,
          });
      } catch (e) {
          toast({
              variant: "destructive",
              title: "Add Failed",
              description: "Could not add server.",
          });
      }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">MCP Servers</h2>
          <p className="text-muted-foreground">
            Manage your MCP servers for this IDE.
          </p>
        </div>
        <Dialog open={isAdding} onOpenChange={setIsAdding}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" /> Add Server
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add New Server</DialogTitle>
                    <DialogDescription>
                        Register a new MCP server configuration.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Name</Label>
                        <Input
                            id="name"
                            value={newServer.name}
                            onChange={(e) => setNewServer({...newServer, name: e.target.value})}
                            className="col-span-3"
                            placeholder="my-server"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="command" className="text-right">Command</Label>
                        <Input
                            id="command"
                            value={newServer.command}
                            onChange={(e) => setNewServer({...newServer, command: e.target.value})}
                            className="col-span-3"
                            placeholder="npx or node"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="args" className="text-right">Args</Label>
                        <Input
                            id="args"
                            value={newServer.args}
                            onChange={(e) => setNewServer({...newServer, args: e.target.value})}
                            className="col-span-3"
                            placeholder="-y @anthropic/server..."
                        />
                    </div>
                    <div className="grid grid-cols-4 items-start gap-4">
                       <Label htmlFor="env" className="text-right mt-2">Env</Label>
                       <textarea
                           id="env"
                           className="col-span-3 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
                           value={newServer.env}
                           onChange={(e) => setNewServer({...newServer, env: e.target.value})}
                       />
                   </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleAddServer}>Add Server</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {servers.map((server) => (
          <ServerCard key={server.id} server={server} ideType={ideType} />
        ))}
        {servers.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center p-8 border border-dashed rounded-lg text-muted-foreground bg-muted/20">
                <p>No servers configured.</p>
                <Button variant="link" onClick={() => setIsAdding(true)}>Add your first server</Button>
            </div>
        )}
      </div>
    </div>
  );
};
