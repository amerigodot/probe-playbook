import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Member {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profiles: { display_name: string | null } | null;
}

export default function SettingsPage() {
  const { currentWorkspace, refetch } = useWorkspace();
  const [members, setMembers] = useState<Member[]>([]);
  const [wsName, setWsName] = useState("");

  useEffect(() => {
    if (!currentWorkspace) return;
    setWsName(currentWorkspace.name);
    const fetchMembers = async () => {
      const { data } = await supabase
        .from("workspace_members")
        .select("id, user_id, role, joined_at, profiles(display_name)")
        .eq("workspace_id", currentWorkspace.id);
      setMembers((data as any[]) ?? []);
    };
    fetchMembers();
  }, [currentWorkspace]);

  const handleUpdateName = async () => {
    if (!currentWorkspace || !wsName.trim()) return;
    const { error } = await supabase
      .from("workspaces")
      .update({ name: wsName.trim() })
      .eq("id", currentWorkspace.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Workspace updated");
      refetch();
    }
  };

  const roleColor: Record<string, string> = {
    owner: "bg-primary/20 text-primary border-primary/30",
    admin: "bg-severity-warning/20 text-severity-warning border-severity-warning/30",
    observer: "bg-muted text-muted-foreground border-border",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your workspace</p>
      </div>

      <Card className="border-border bg-card">
        <CardHeader><CardTitle className="text-base">Workspace Name</CardTitle></CardHeader>
        <CardContent className="flex gap-3">
          <Input value={wsName} onChange={(e) => setWsName(e.target.value)} className="max-w-sm" />
          <Button onClick={handleUpdateName} size="sm">Save</Button>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader><CardTitle className="text-base">Members</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.id} className="border-border">
                  <TableCell>{m.profiles?.display_name || m.user_id.slice(0, 8)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`capitalize text-xs ${roleColor[m.role] || ""}`}>
                      {m.role}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
