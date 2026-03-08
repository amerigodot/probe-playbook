import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, ChevronDown, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface AuditEntry {
  id: string;
  user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

const ACTION_COLORS: Record<string, string> = {
  create: "bg-severity-healthy/20 text-severity-healthy border-severity-healthy/30",
  update: "bg-severity-info/20 text-severity-info border-severity-info/30",
  delete: "bg-severity-critical/20 text-severity-critical border-severity-critical/30",
  read: "bg-muted text-muted-foreground border-border",
  transition: "bg-severity-warning/20 text-severity-warning border-severity-warning/30",
  ingest: "bg-primary/20 text-primary border-primary/30",
};

const RESOURCE_TYPES = ["all", "agent", "incident", "policy", "event", "workspace", "member"];
const ACTIONS = ["all", "create", "update", "delete", "read", "transition", "ingest"];

export default function AuditLog() {
  const { currentWorkspace } = useWorkspace();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionFilter, setActionFilter] = useState("all");
  const [resourceFilter, setResourceFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchEntries = async () => {
    if (!currentWorkspace) return;
    setLoading(true);

    let query = supabase
      .from("audit_logs")
      .select("*")
      .eq("workspace_id", currentWorkspace.id)
      .order("created_at", { ascending: false })
      .limit(200);

    if (actionFilter !== "all") query = query.eq("action", actionFilter);
    if (resourceFilter !== "all") query = query.eq("resource_type", resourceFilter);
    if (dateFrom) query = query.gte("created_at", dateFrom.toISOString());
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      query = query.lte("created_at", end.toISOString());
    }

    const { data } = await query;
    setEntries((data as AuditEntry[] | null) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchEntries();
  }, [currentWorkspace, actionFilter, resourceFilter, dateFrom, dateTo]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-sm text-muted-foreground">Complete record of all actions across your workspace</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Action" /></SelectTrigger>
          <SelectContent>
            {ACTIONS.map((a) => (
              <SelectItem key={a} value={a}>{a === "all" ? "All actions" : a}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={resourceFilter} onValueChange={setResourceFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Resource" /></SelectTrigger>
          <SelectContent>
            {RESOURCE_TYPES.map((r) => (
              <SelectItem key={r} value={r}>{r === "all" ? "All resources" : r}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-36 justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateFrom ? format(dateFrom, "MMM d") : "From"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-36 justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateTo ? format(dateTo, "MMM d") : "To"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>

        {(dateFrom || dateTo) && (
          <Button variant="ghost" size="sm" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }}>
            Clear dates
          </Button>
        )}
      </div>

      {/* Table */}
      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="w-8"></TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Resource ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
                  </TableCell>
                </TableRow>
              ) : entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No audit entries found
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((entry) => {
                  const isExpanded = expandedId === entry.id;
                  const hasDetails = entry.details && Object.keys(entry.details).length > 0;
                  return (
                    <>
                      <TableRow
                        key={entry.id}
                        className={cn(
                          "border-border",
                          hasDetails && "cursor-pointer hover:bg-muted/50"
                        )}
                        onClick={() => hasDetails && setExpandedId(isExpanded ? null : entry.id)}
                      >
                        <TableCell className="w-8 px-2">
                          {hasDetails && (
                            isExpanded
                              ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(entry.created_at), "yyyy-MM-dd HH:mm:ss")}
                        </TableCell>
                        <TableCell className="text-sm">
                          {entry.profiles?.display_name || (entry.user_id ? entry.user_id.slice(0, 8) + "…" : "system")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("text-xs capitalize font-mono", ACTION_COLORS[entry.action] || "")}>
                            {entry.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-primary capitalize">{entry.resource_type}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {entry.resource_id ? entry.resource_id.slice(0, 8) + "…" : "—"}
                        </TableCell>
                      </TableRow>
                      {isExpanded && hasDetails && (
                        <TableRow key={entry.id + "-details"} className="border-border bg-muted/30">
                          <TableCell colSpan={6} className="p-4">
                            <pre className="text-xs font-mono text-foreground bg-background/50 rounded-lg p-4 overflow-x-auto max-h-64">
                              {JSON.stringify(entry.details, null, 2)}
                            </pre>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
