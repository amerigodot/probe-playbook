/*
 * Copyright 2026 Amerigo Di Maria
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuditLog } from "@/hooks/useAuditLog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";

interface Agent {
  id: string;
  name: string;
  description: string | null;
  environment: string;
  owner_team: string | null;
  created_at: string;
}

export default function Agents() {
  const { currentWorkspace } = useWorkspace();
  const { log: auditLog } = useAuditLog();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", environment: "dev", owner_team: "" });

  const fetchAgents = async () => {
    if (!currentWorkspace) return;
    const { data } = await supabase
      .from("agents")
      .select("*")
      .eq("workspace_id", currentWorkspace.id)
      .order("created_at", { ascending: false });
    setAgents((data as Agent[]) ?? []);
  };

  useEffect(() => { fetchAgents(); }, [currentWorkspace]);

  const handleCreate = async () => {
    if (!currentWorkspace || !form.name) return;
    const { data, error } = await supabase.from("agents").insert({
      workspace_id: currentWorkspace.id,
      name: form.name,
      description: form.description || null,
      environment: form.environment as any,
      owner_team: form.owner_team || null,
    }).select("id").single();
    if (error) toast.error(error.message);
    else {
      auditLog("create", "agent", data?.id, { name: form.name, environment: form.environment });
      toast.success("Agent created");
      setOpen(false);
      setForm({ name: "", description: "", environment: "dev", owner_team: "" });
      fetchAgents();
    }
  };

  const envColor: Record<string, string> = {
    prod: "bg-severity-critical/20 text-severity-critical border-severity-critical/30",
    stage: "bg-severity-warning/20 text-severity-warning border-severity-warning/30",
    dev: "bg-severity-info/20 text-severity-info border-severity-info/30",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agents</h1>
          <p className="text-sm text-muted-foreground">Registered AI agents and services</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-2 h-4 w-4" />Add Agent</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Register New Agent</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="GPT-4 Summarizer" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What this agent does..." />
              </div>
              <div className="space-y-2">
                <Label>Environment</Label>
                <Select value={form.environment} onValueChange={(v) => setForm({ ...form, environment: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dev">Development</SelectItem>
                    <SelectItem value="stage">Staging</SelectItem>
                    <SelectItem value="prod">Production</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Owner Team</Label>
                <Input value={form.owner_team} onChange={(e) => setForm({ ...form, owner_team: e.target.value })} placeholder="Platform Team" />
              </div>
              <Button onClick={handleCreate} className="w-full">Create Agent</Button>
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
                <TableHead>Environment</TableHead>
                <TableHead>Owner Team</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No agents registered</TableCell></TableRow>
              ) : agents.map((agent) => (
                <TableRow key={agent.id} className="border-border">
                  <TableCell className="font-medium">{agent.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs capitalize font-mono ${envColor[agent.environment] || ""}`}>
                      {agent.environment}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{agent.owner_team || "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-xs truncate">{agent.description || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
