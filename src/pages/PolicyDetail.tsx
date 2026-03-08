import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuditLog } from "@/hooks/useAuditLog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { SeverityBadge } from "@/components/SeverityBadge";
import { ArrowLeft, Bot, Plus, X, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Policy {
  id: string;
  name: string;
  description: string | null;
  rule_config: any;
  created_at: string;
  updated_at: string;
}

interface AttachedAgent {
  agent_id: string;
  agents: { id: string; name: string; environment: string } | null;
}

interface Violation {
  id: string;
  agent_id: string;
  event_id: string;
  violation_details: any;
  severity: string;
  created_at: string;
  agents: { name: string } | null;
}

interface AvailableAgent {
  id: string;
  name: string;
  environment: string;
}

export default function PolicyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const { log: auditLog } = useAuditLog();

  const [policy, setPolicy] = useState<Policy | null>(null);
  const [attachedAgents, setAttachedAgents] = useState<AttachedAgent[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [availableAgents, setAvailableAgents] = useState<AvailableAgent[]>([]);
  const [ruleConfigText, setRuleConfigText] = useState("");
  const [editing, setEditing] = useState(false);
  const [attachDialogOpen, setAttachDialogOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState("");

  const fetchAll = async () => {
    if (!id || !currentWorkspace) return;

    const [policyRes, agentsRes, violationsRes, allAgentsRes] = await Promise.all([
      supabase.from("policies").select("*").eq("id", id).single(),
      supabase
        .from("agent_policies")
        .select("agent_id, agents(id, name, environment)")
        .eq("policy_id", id),
      supabase
        .from("policy_violations")
        .select("id, agent_id, event_id, violation_details, severity, created_at, agents(name)")
        .eq("policy_id", id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("agents")
        .select("id, name, environment")
        .eq("workspace_id", currentWorkspace.id)
        .order("name"),
    ]);

    if (policyRes.data) {
      const p = policyRes.data as unknown as Policy;
      setPolicy(p);
      setRuleConfigText(JSON.stringify(p.rule_config, null, 2));
    }
    setAttachedAgents((agentsRes.data as unknown as AttachedAgent[]) ?? []);
    setViolations((violationsRes.data as unknown as Violation[]) ?? []);
    setAvailableAgents((allAgentsRes.data as unknown as AvailableAgent[]) ?? []);
  };

  useEffect(() => {
    fetchAll();
  }, [id, currentWorkspace]);

  const handleSaveConfig = async () => {
    if (!id || !policy) return;
    let parsed;
    try {
      parsed = JSON.parse(ruleConfigText);
    } catch {
      toast.error("Invalid JSON");
      return;
    }
    const { error } = await supabase
      .from("policies")
      .update({ rule_config: parsed } as any)
      .eq("id", id);
    if (error) {
      toast.error(error.message);
    } else {
      auditLog("update", "policy", id, { updated_fields: ["rule_config"] });
      toast.success("Rule config saved");
      setEditing(false);
      fetchAll();
    }
  };

  const handleAttachAgent = async () => {
    if (!id || !selectedAgentId) return;
    const { error } = await supabase
      .from("agent_policies")
      .insert({ agent_id: selectedAgentId, policy_id: id });
    if (error) {
      toast.error(error.message.includes("duplicate") ? "Agent already attached" : error.message);
    } else {
      auditLog("update", "policy", id, { attached_agent: selectedAgentId });
      toast.success("Agent attached");
      setAttachDialogOpen(false);
      setSelectedAgentId("");
      fetchAll();
    }
  };

  const handleDetachAgent = async (agentId: string) => {
    if (!id) return;
    const { error } = await supabase
      .from("agent_policies")
      .delete()
      .eq("agent_id", agentId)
      .eq("policy_id", id);
    if (error) {
      toast.error(error.message);
    } else {
      auditLog("update", "policy", id, { detached_agent: agentId });
      toast.success("Agent detached");
      fetchAll();
    }
  };

  if (!policy) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const attachedIds = new Set(attachedAgents.map((a) => a.agent_id));
  const unattachedAgents = availableAgents.filter((a) => !attachedIds.has(a.id));

  const envColor: Record<string, string> = {
    prod: "bg-severity-critical/20 text-severity-critical border-severity-critical/30",
    stage: "bg-severity-warning/20 text-severity-warning border-severity-warning/30",
    dev: "bg-severity-info/20 text-severity-info border-severity-info/30",
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/policies")}>
        <ArrowLeft className="mr-2 h-4 w-4" />Back to Policies
      </Button>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{policy.name}</h1>
        {policy.description && (
          <p className="text-sm text-muted-foreground mt-1">{policy.description}</p>
        )}
        <p className="text-xs text-muted-foreground font-mono mt-2">
          Created {format(new Date(policy.created_at), "yyyy-MM-dd HH:mm")} · Updated {format(new Date(policy.updated_at), "yyyy-MM-dd HH:mm")}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Rule config */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Rule Configuration</CardTitle>
              {editing ? (
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setRuleConfigText(JSON.stringify(policy.rule_config, null, 2)); }}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSaveConfig}>Save</Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit</Button>
              )}
            </CardHeader>
            <CardContent>
              {editing ? (
                <Textarea
                  value={ruleConfigText}
                  onChange={(e) => setRuleConfigText(e.target.value)}
                  className="font-mono text-xs min-h-[240px] bg-background"
                />
              ) : (
                <pre className="text-xs font-mono text-foreground bg-background/50 rounded-lg p-4 overflow-x-auto max-h-80">
                  {JSON.stringify(policy.rule_config, null, 2)}
                </pre>
              )}
            </CardContent>
          </Card>

          {/* Violations */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-severity-warning" />
                Recent Violations
                {violations.length > 0 && (
                  <Badge variant="outline" className="text-xs ml-1">{violations.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead>Agent</TableHead>
                    <TableHead>Rule</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {violations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No violations recorded
                      </TableCell>
                    </TableRow>
                  ) : (
                    violations.map((v) => (
                      <TableRow key={v.id} className="border-border">
                        <TableCell className="font-medium text-sm">{v.agents?.name ?? "Unknown"}</TableCell>
                        <TableCell className="font-mono text-xs text-primary">
                          {v.violation_details?.rule_type ?? "—"}
                        </TableCell>
                        <TableCell><SeverityBadge severity={v.severity} /></TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                          {v.violation_details?.message ?? "—"}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(v.created_at), "MMM d, HH:mm")}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Right column: Attached agents */}
        <div>
          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Bot className="h-4 w-4" />
                Attached Agents
                <Badge variant="outline" className="text-xs">{attachedAgents.length}</Badge>
              </CardTitle>
              <Button size="sm" variant="outline" onClick={() => setAttachDialogOpen(true)}>
                <Plus className="h-3 w-3 mr-1" />Attach
              </Button>
            </CardHeader>
            <CardContent>
              {attachedAgents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No agents attached to this policy</p>
              ) : (
                <div className="space-y-2">
                  {attachedAgents.map((aa) => (
                    <div
                      key={aa.agent_id}
                      className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Bot className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium truncate">{aa.agents?.name ?? "Unknown"}</span>
                        {aa.agents?.environment && (
                          <Badge variant="outline" className={`text-[10px] capitalize font-mono ${envColor[aa.agents.environment] || ""}`}>
                            {aa.agents.environment}
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-severity-critical"
                        onClick={() => handleDetachAgent(aa.agent_id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Attach agent dialog */}
      <Dialog open={attachDialogOpen} onOpenChange={setAttachDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Attach Agent to Policy</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {unattachedAgents.length === 0 ? (
              <p className="text-sm text-muted-foreground">All agents are already attached to this policy</p>
            ) : (
              <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                <SelectTrigger><SelectValue placeholder="Select an agent…" /></SelectTrigger>
                <SelectContent>
                  {unattachedAgents.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} ({a.environment})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAttachDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAttachAgent} disabled={!selectedAgentId}>Attach</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
