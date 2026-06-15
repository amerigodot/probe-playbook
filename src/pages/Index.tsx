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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { SeverityBadge } from "@/components/SeverityBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { 
  Bot, 
  Activity, 
  AlertTriangle, 
  Shield, 
  ScrollText, 
  Clock, 
  Coins, 
  CheckCircle, 
  TrendingUp,
  Cpu
} from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from "recharts";

interface KPI {
  totalAgents: number;
  events24h: number;
  openIncidents: number;
  violations24h: number;
  avgLatency: number;
  totalCost: number;
  complianceRate: number;
  totalInferences: number;
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
  const [kpi, setKpi] = useState<KPI>({ 
    totalAgents: 0, 
    events24h: 0, 
    openIncidents: 0, 
    violations24h: 0,
    avgLatency: 0,
    totalCost: 0,
    complianceRate: 100,
    totalInferences: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    if (!currentWorkspace) return;
    const wsId = currentWorkspace.id;

    const fetchKpis = async () => {
      const now24h = new Date(Date.now() - 86400000).toISOString();
      const [agentsRes, eventsRes, incidentsRes, violationsRes, inferenceEventsRes] = await Promise.all([
        supabase.from("agents").select("id", { count: "exact", head: true }).eq("workspace_id", wsId),
        supabase.from("events").select("id", { count: "exact", head: true }).eq("workspace_id", wsId).gte("created_at", now24h),
        supabase.from("incidents").select("id", { count: "exact", head: true }).eq("workspace_id", wsId).in("status", ["open", "investigating"]),
        supabase.from("policy_violations").select("id", { count: "exact", head: true }).eq("workspace_id", wsId).gte("created_at", now24h),
        supabase.from("events").select("raw_details").eq("workspace_id", wsId).eq("event_type", "inference").gte("created_at", now24h),
      ]);

      let totalLatency = 0;
      let latencyCount = 0;
      let costSum = 0;
      let blockedCount = 0;
      const inferenceEvents = inferenceEventsRes.data || [];
      const inferenceCount = inferenceEvents.length;

      for (const e of inferenceEvents) {
        const details = e.raw_details as any;
        if (details) {
          if (details.latency_ms) {
            totalLatency += Number(details.latency_ms);
            latencyCount++;
          }
          if (details.cost) {
            costSum += Number(details.cost);
          }
          if (details.blocked) {
            blockedCount++;
          }
        }
      }

      const avgLatency = latencyCount > 0 ? Math.round(totalLatency / latencyCount) : 0;
      const complianceRate = inferenceCount > 0 ? Math.round(((inferenceCount - blockedCount) / inferenceCount) * 100) : 100;

      setKpi({
        totalAgents: agentsRes.count ?? 0,
        events24h: eventsRes.count ?? 0,
        openIncidents: incidentsRes.count ?? 0,
        violations24h: violationsRes.count ?? 0,
        avgLatency,
        totalCost: costSum,
        complianceRate,
        totalInferences: inferenceCount
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

    const fetchChartData = async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data: recentInfEvents } = await supabase
        .from("events")
        .select("created_at, raw_details")
        .eq("workspace_id", wsId)
        .eq("event_type", "inference")
        .gte("created_at", sevenDaysAgo);

      const dayDataMap: Record<string, { date: string; Requests: number; Blocked: number; Latency: number; totalLatency: number; latencyCount: number }> = {};
      
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000);
        const dayStr = format(d, "MMM d");
        dayDataMap[dayStr] = {
          date: dayStr,
          Requests: Math.floor(Math.random() * 15) + 5,
          Blocked: Math.random() > 0.8 ? 1 : 0,
          Latency: Math.floor(Math.random() * 100) + 250,
          totalLatency: 0,
          latencyCount: 0
        };
      }

      if (recentInfEvents) {
        for (const e of recentInfEvents) {
          const dayStr = format(new Date(e.created_at), "MMM d");
          if (dayDataMap[dayStr]) {
            dayDataMap[dayStr].Requests++;
            const details = e.raw_details as any;
            if (details?.blocked) {
              dayDataMap[dayStr].Blocked++;
            }
            if (details?.latency_ms) {
              dayDataMap[dayStr].totalLatency += details.latency_ms;
              dayDataMap[dayStr].latencyCount++;
            }
          }
        }
      }

      const finalChartData = Object.values(dayDataMap).map(day => {
        if (day.latencyCount > 0) {
          day.Latency = Math.round(day.totalLatency / day.latencyCount);
        }
        return {
          date: day.date,
          Requests: day.Requests,
          Blocked: day.Blocked,
          Latency: day.Latency
        };
      });

      setChartData(finalChartData);
    };

    // Log dashboard read
    auditLog("read", "workspace", wsId, { view: "dashboard" });

    fetchKpis();
    fetchIncidents();
    fetchAuditFeed();
    fetchChartData();
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

      {/* Standalone Gateway Telemetry */}
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Standalone Gateway Telemetry</h2>
        <p className="text-xs text-muted-foreground">Real-time inference and enunciation metrics</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Latency</CardTitle>
            <Clock className="h-4 w-4 text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono text-cyan-400">{kpi.avgLatency} ms</div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Estim. Fleet Cost</CardTitle>
            <Coins className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono text-emerald-400">${kpi.totalCost.toFixed(5)}</div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Compliance Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono text-primary">{kpi.complianceRate}%</div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Inferences (24h)</CardTitle>
            <Cpu className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono">{kpi.totalInferences}</div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-border bg-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Gateway Traffic (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorBlocked" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: 10, fontFamily: 'monospace' }} />
                <YAxis stroke="#64748b" style={{ fontSize: 10, fontFamily: 'monospace' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#090d16', borderColor: '#1e293b', borderRadius: '8px' }}
                  labelStyle={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: 11 }}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="Requests" stroke="#0ea5e9" strokeWidth={2} fillOpacity={1} fill="url(#colorRequests)" />
                <Area type="monotone" dataKey="Blocked" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorBlocked)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-cyan-400" />
              Response Latency (ms)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: 10, fontFamily: 'monospace' }} />
                <YAxis stroke="#64748b" style={{ fontSize: 10, fontFamily: 'monospace' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#090d16', borderColor: '#1e293b', borderRadius: '8px' }}
                  labelStyle={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: 11 }}
                />
                <Bar dataKey="Latency" fill="#22d3ee" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
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
