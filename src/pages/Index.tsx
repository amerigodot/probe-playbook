import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuditLog } from "@/hooks/useAuditLog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { SeverityBadge } from "@/components/SeverityBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { Bot, Activity, AlertTriangle, Shield, ScrollText } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface KPI {
  totalAgents: number;
  events24h: number;
  openIncidents: number;
  violations24h: number;
}

interface Incident {
  id: string;
  title: string;
  severity: string;
  status: string;
  created_at: string;
  tags: string[];
}

interface AuditEntry {
  id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  created_at: string;
  user_id: string | null;
}

const ACTION_COLORS: Record<string, string> = {
  create: "bg-severity-healthy/20 text-severity-healthy border-severity-healthy/30",
  update: "bg-severity-info/20 text-severity-info border-severity-info/30",
  delete: "bg-severity-critical/20 text-severity-critical border-severity-critical/30",
  read: "bg-muted text-muted-foreground border-border",
  transition: "bg-severity-warning/20 text-severity-warning border-severity-warning/30",
  ingest: "bg-primary/20 text-primary border-primary/30",
};

export default function Index() {
  const { currentWorkspace } = useWorkspace();
  const { log: auditLog } = useAuditLog();
  const navigate = useNavigate();
  const [kpi, setKpi] = useState<KPI>({ totalAgents: 0, events24h: 0, openIncidents: 0, violations24h: 0 });
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    if (!currentWorkspace) return;
    const wsId = currentWorkspace.id;

    const fetchKpis = async () => {
      const now24h = new Date(Date.now() - 86400000).toISOString();
      const [agentsRes, eventsRes, incidentsRes, violationsRes] = await Promise.all([
        supabase.from("agents").select("id", { count: "exact", head: true }).eq("workspace_id", wsId),
        supabase.from("events").select("id", { count: "exact", head: true }).eq("workspace_id", wsId).gte("created_at", now24h),
        supabase.from("incidents").select("id", { count: "exact", head: true }).eq("workspace_id", wsId).in("status", ["open", "investigating"]),
        supabase.from("policy_violations").select("id", { count: "exact", head: true }).eq("workspace_id", wsId).gte("created_at", now24h),
      ]);
      setKpi({
        totalAgents: agentsRes.count ?? 0,
        events24h: eventsRes.count ?? 0,
        openIncidents: incidentsRes.count ?? 0,
        violations24h: violationsRes.count ?? 0,
      });
    };

    const fetchIncidents = async () => {
      let query = supabase
        .from("incidents")
        .select("id, title, severity, status, created_at, tags")
        .eq("workspace_id", wsId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (severityFilter !== "all") query = query.eq("severity", severityFilter as any);
      if (statusFilter !== "all") query = query.eq("status", statusFilter as any);

      const { data } = await query;
      setIncidents((data as Incident[]) ?? []);
    };

    const fetchAuditFeed = async () => {
      const { data } = await supabase
        .from("audit_logs")
        .select("id, action, resource_type, resource_id, created_at, user_id")
        .eq("workspace_id", wsId)
        .order("created_at", { ascending: false })
        .limit(8);
      setAuditEntries((data as unknown as AuditEntry[]) ?? []);
    };

    // Log dashboard read
    auditLog("read", "workspace", wsId, { view: "dashboard" });

    fetchKpis();
    fetchIncidents();
    fetchAuditFeed();
  }, [currentWorkspace, severityFilter, statusFilter]);

  const kpiCards = [
    { title: "Total Agents", value: kpi.totalAgents, icon: Bot, color: "text-primary" },
    { title: "Events (24h)", value: kpi.events24h, icon: Activity, color: "text-severity-info" },
    { title: "Open Incidents", value: kpi.openIncidents, icon: AlertTriangle, color: "text-severity-critical" },
    { title: "Violations (24h)", value: kpi.violations24h, icon: Shield, color: "text-severity-warning" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of your AI agent operations</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card) => (
          <Card key={card.title} className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Incidents — 2/3 width */}
        <Card className="border-border bg-card lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Incidents</CardTitle>
            <div className="flex gap-2">
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="Severity" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All severity</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="investigating">Investigating</SelectItem>
                  <SelectItem value="mitigated">Mitigated</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Title</TableHead>
                  <TableHead className="text-muted-foreground">Severity</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-muted-foreground">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incidents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No incidents found
                    </TableCell>
                  </TableRow>
                ) : (
                  incidents.map((inc) => (
                    <TableRow
                      key={inc.id}
                      className="border-border cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/incidents/${inc.id}`)}
                    >
                      <TableCell className="font-medium">{inc.title}</TableCell>
                      <TableCell><SeverityBadge severity={inc.severity} /></TableCell>
                      <TableCell><StatusBadge status={inc.status} /></TableCell>
                      <TableCell className="text-muted-foreground text-sm font-mono">
                        {format(new Date(inc.created_at), "MMM d, HH:mm")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Recent Audit Activity — 1/3 width */}
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ScrollText className="h-4 w-4" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {auditEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent activity</p>
            ) : (
              <div className="space-y-3">
                {auditEntries.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-2">
                    <Badge variant="outline" className={cn("text-[10px] capitalize font-mono shrink-0 mt-0.5", ACTION_COLORS[entry.action] || "")}>
                      {entry.action}
                    </Badge>
                    <div className="min-w-0">
                      <p className="text-xs capitalize text-foreground">{entry.resource_type}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {format(new Date(entry.created_at), "MMM d, HH:mm")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
