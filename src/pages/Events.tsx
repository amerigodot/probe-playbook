import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuditLog } from "@/hooks/useAuditLog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { SeverityBadge } from "@/components/SeverityBadge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { format } from "date-fns";
import { Search } from "lucide-react";

interface Event {
  id: string;
  agent_id: string | null;
  session_id: string | null;
  event_type: string;
  severity: string;
  payload_summary: string | null;
  raw_details: any;
  created_at: string;
}

export default function Events() {
  const { currentWorkspace } = useWorkspace();
  const { log: auditLog } = useAuditLog();
  const [events, setEvents] = useState<Event[]>([]);
  const [severityFilter, setSeverityFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  useEffect(() => {
    if (!currentWorkspace) return;
    const fetchEvents = async () => {
      let query = supabase
        .from("events")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (severityFilter !== "all") query = query.eq("severity", severityFilter as any);
      if (search) query = query.ilike("event_type", `%${search}%`);

      const { data } = await query;
      setEvents((data as Event[]) ?? []);
    };
    fetchEvents();
  }, [currentWorkspace, severityFilter, search]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Event Stream</h1>
        <p className="text-sm text-muted-foreground">Real-time agent activity log</p>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search event types..."
            className="pl-9"
          />
        </div>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Severity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="info">Info</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead>Timestamp</TableHead>
                <TableHead>Event Type</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Summary</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No events found</TableCell></TableRow>
              ) : events.map((event) => (
                <TableRow
                  key={event.id}
                  className="border-border cursor-pointer hover:bg-muted/50"
                  onClick={() => { setSelectedEvent(event); auditLog("read", "event", event.id, { view: "event_detail" }); }}
                >
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {format(new Date(event.created_at), "MMM d, HH:mm:ss")}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{event.event_type}</TableCell>
                  <TableCell><SeverityBadge severity={event.severity} /></TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-xs truncate">{event.payload_summary || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <SheetContent className="w-[500px] sm:w-[600px]">
          <SheetHeader>
            <SheetTitle className="font-mono">{selectedEvent?.event_type}</SheetTitle>
          </SheetHeader>
          {selectedEvent && (
            <div className="mt-4 space-y-4">
              <div className="flex gap-4">
                <SeverityBadge severity={selectedEvent.severity} />
                <span className="text-xs text-muted-foreground font-mono">
                  {format(new Date(selectedEvent.created_at), "yyyy-MM-dd HH:mm:ss.SSS")}
                </span>
              </div>
              {selectedEvent.payload_summary && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Summary</p>
                  <p className="text-sm">{selectedEvent.payload_summary}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground mb-1">Raw Details</p>
                <pre className="bg-muted p-4 rounded-lg text-xs font-mono overflow-auto max-h-96">
                  {JSON.stringify(selectedEvent.raw_details, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
