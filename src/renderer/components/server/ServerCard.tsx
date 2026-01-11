import React from 'react';
import { MCPServer, IDEType } from '../../types/mcp';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Switch } from '../ui/switch';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Settings, Terminal, Trash2, Edit2 } from 'lucide-react';
import { useConfigStore } from '../../stores/useConfigStore';
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
import { toast } from "../ui/use-toast"

interface ServerCardProps {
  server: MCPServer;
  ideType: IDEType;
}

export const ServerCard: React.FC<ServerCardProps> = ({ server, ideType }) => {
  const { toggleServer, removeServer, updateServer } = useConfigStore();
  const [isEditing, setIsEditing] = React.useState(false);
  const [editForm, setEditForm] = React.useState({
      command: server.command,
      args: server.args.join(' '),
      env: JSON.stringify(server.env || {}, null, 2)
  });

  const handleToggle = async (checked: boolean) => {
    try {
        await toggleServer(ideType, server.id, checked);
        toast({
            title: checked ? "Server Enabled" : "Server Disabled",
            description: `${server.name} has been ${checked ? 'enabled' : 'disabled'}.`,
        })
    } catch (e) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to toggle server state.",
        })
    }
  };

  const handleDelete = async () => {
       if (confirm(`Are you sure you want to remove ${server.name}?`)) {
           try {
               await removeServer(ideType, server.id);
               toast({
                   title: "Server Removed",
                   description: `${server.name} has been removed.`,
               })
           } catch (e) {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Failed to remove server.",
                })
           }
       }
  }

  const handleSaveEdit = async () => {
      try {
          const args = editForm.args.split(' ').filter(a => a.length > 0);
          let env = {};
          try {
              env = JSON.parse(editForm.env);
          } catch (e) {
              toast({
                  variant: "destructive",
                  title: "Invalid JSON",
                  description: "Environment variables must be valid JSON.",
              });
              return;
          }

          await updateServer(ideType, server.id, {
              command: editForm.command,
              args,
              env
          });
          setIsEditing(false);
          toast({
              title: "Server Updated",
              description: "Configuration saved successfully.",
          })
      } catch (e) {
          toast({
              variant: "destructive",
              title: "Update Failed",
              description: "Could not update server configuration.",
          })
      }
  }

  return (
    <Card className="transition-all hover:shadow-md">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            {server.name}
            {!server.enabled && (
                <Badge variant="secondary" className="text-[10px] h-5">Disabled</Badge>
            )}
          </CardTitle>
          <CardDescription className="text-xs font-mono truncate max-w-[300px]" title={`${server.command} ${server.args.join(' ')}`}>
             {server.command} {server.args.join(' ')}
          </CardDescription>
        </div>
        <Switch
          checked={server.enabled}
          onCheckedChange={handleToggle}
        />
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mt-4">
           <div className="flex gap-2">
               {server.env && Object.keys(server.env).length > 0 && (
                   <Badge variant="outline" className="text-xs font-normal">
                       {Object.keys(server.env).length} Env Vars
                   </Badge>
               )}
           </div>
           <div className="flex gap-1">
               <Dialog open={isEditing} onOpenChange={setIsEditing}>
                   <DialogTrigger asChild>
                       <Button variant="ghost" size="icon" className="h-8 w-8">
                           <Edit2 className="h-4 w-4 text-muted-foreground" />
                       </Button>
                   </DialogTrigger>
                   <DialogContent className="sm:max-w-[425px]">
                       <DialogHeader>
                           <DialogTitle>Edit Server: {server.name}</DialogTitle>
                           <DialogDescription>
                               Make changes to the server configuration here.
                           </DialogDescription>
                       </DialogHeader>
                       <div className="grid gap-4 py-4">
                           <div className="grid grid-cols-4 items-center gap-4">
                               <Label htmlFor="command" className="text-right">Command</Label>
                               <Input
                                   id="command"
                                   value={editForm.command}
                                   onChange={(e) => setEditForm({...editForm, command: e.target.value})}
                                   className="col-span-3"
                               />
                           </div>
                           <div className="grid grid-cols-4 items-center gap-4">
                               <Label htmlFor="args" className="text-right">Args</Label>
                               <Input
                                   id="args"
                                   value={editForm.args}
                                   onChange={(e) => setEditForm({...editForm, args: e.target.value})}
                                   className="col-span-3"
                                   placeholder="Space separated arguments"
                               />
                           </div>
                           <div className="grid grid-cols-4 items-start gap-4">
                               <Label htmlFor="env" className="text-right mt-2">Env (JSON)</Label>
                               <textarea
                                   id="env"
                                   className="col-span-3 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
                                   value={editForm.env}
                                   onChange={(e) => setEditForm({...editForm, env: e.target.value})}
                               />
                           </div>
                       </div>
                       <DialogFooter>
                           <Button type="submit" onClick={handleSaveEdit}>Save changes</Button>
                       </DialogFooter>
                   </DialogContent>
               </Dialog>

               <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={handleDelete}>
                   <Trash2 className="h-4 w-4" />
               </Button>
           </div>
        </div>
      </CardContent>
    </Card>
  );
};
