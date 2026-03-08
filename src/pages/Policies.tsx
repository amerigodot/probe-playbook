import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuditLog } from "@/hooks/useAuditLog";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface Policy {
  id: string;
  name: string;
  description: string | null;
  rule_config: any;
  created_at: string;
}

export default function Policies() {
  const { currentWorkspace } = useWorkspace();
  const { log: auditLog } = useAuditLog();
  const navigate = useNavigate();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", rule_config: '{\n  "type": "pii_detection",\n  "enabled": true\n}' });

  const fetchPolicies = async () => {
    if (!currentWorkspace) return;
    const { data } = await supabase
      .from("policies")
      .select("*")
      .eq("workspace_id", currentWorkspace.id)
      .order("created_at", { ascending: false });
    setPolicies((data as Policy[]) ?? []);
  };

  useEffect(() => { fetchPolicies(); }, [currentWorkspace]);

  const handleCreate = async () => {
    if (!currentWorkspace || !form.name) return;
    let parsedConfig;
    try {
      parsedConfig = JSON.parse(form.rule_config);
    } catch {
      toast.error("Invalid JSON in rule config");
      return;
    }
    const { data, error } = await supabase.from("policies").insert({
      workspace_id: currentWorkspace.id,
      name: form.name,
      description: form.description || null,
      rule_config: parsedConfig,
    }).select("id").single();
    if (error) toast.error(error.message);
    else {
      auditLog("create", "policy", data?.id, { name: form.name });
      toast.success("Policy created");
      setOpen(false);
      setForm({ name: "", description: "", rule_config: '{\n  "type": "pii_detection",\n  "enabled": true\n}' });
      fetchPolicies();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Policies</h1>
          <p className="text-sm text-muted-foreground">Define governance rules for your agents</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-2 h-4 w-4" />Add Policy</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Policy</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="PII Detection" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Rule Configuration (JSON)</Label>
                <Textarea
                  value={form.rule_config}
                  onChange={(e) => setForm({ ...form, rule_config: e.target.value })}
                  className="font-mono text-xs min-h-[120px]"
                />
              </div>
              <Button onClick={handleCreate} className="w-full">Create Policy</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {policies.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No policies defined</TableCell></TableRow>
              ) : policies.map((p) => (
                <TableRow key={p.id} className="border-border cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/policies/${p.id}`)}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-xs truncate">{p.description || "—"}</TableCell>
                  <TableCell className="font-mono text-xs text-primary">{p.rule_config?.type || p.rule_config?.rules?.[0]?.type || "custom"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm font-mono">{format(new Date(p.created_at), "MMM d, HH:mm")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
