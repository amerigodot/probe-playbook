import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SeverityBadge } from "@/components/SeverityBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { Bot, Activity, AlertTriangle, Shield } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

interface KPI {
  totalAgents: number;
  events24h: number;
  openIncidents: number;
  failingPolicies: number;
}

interface Incident {
  id: string;
  title: string;
  severity: string;
  status: string;
  created_at: string;
  tags: string[];
}

export default function Index() {
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const [kpi, setKpi] = useState<KPI>({ totalAgents: 0, events24h: 0, openIncidents: 0, failingPolicies: 0 });
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    if (!currentWorkspace) return;
    const wsId = currentWorkspace.id;

    const fetchKpis = async () => {
      const [agentsRes, eventsRes, incidentsRes, policiesRes] = await Promise.all([
        supabase.from("agents").select("id", { count: "exact", head: true }).eq("workspace_id", wsId),
        supabase.from("events").select("id", { count: "exact", head: true }).eq("workspace_id", wsId).gte("created_at", new Date(Date.now() - 86400000).toISOString()),
        supabase.from("incidents").select("id", { count: "exact", head: true }).eq("workspace_id", wsId).in("status", ["open", "investigating"]),
        supabase.from("policies").select("id", { count: "exact", head: true }).eq("workspace_id", wsId),
      ]);
      setKpi({
        totalAgents: agentsRes.count ?? 0,
        events24h: eventsRes.count ?? 0,
        openIncidents: incidentsRes.count ?? 0,
        failingPolicies: policiesRes.count ?? 0,
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

    fetchKpis();
    fetchIncidents();
  }, [currentWorkspace, severityFilter, statusFilter]);

  const kpiCards = [
    { title: "Total Agents", value: kpi.totalAgents, icon: Bot, color: "text-primary" },
    { title: "Events (24h)", value: kpi.events24h, icon: Activity, color: "text-severity-info" },
    { title: "Open Incidents", value: kpi.openIncidents, icon: AlertTriangle, color: "text-severity-critical" },
    { title: "Active Policies", value: kpi.failingPolicies, icon: Shield, color: "text-severity-healthy" },
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

      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Recent Incidents</CardTitle>
          <div className="flex gap-2">
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All severity</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
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
    </div>
  );
}
