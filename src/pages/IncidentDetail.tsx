import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuditLog } from "@/hooks/useAuditLog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SeverityBadge } from "@/components/SeverityBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Incident {
  id: string;
  title: string;
  description: string | null;
  severity: string;
  status: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
}

interface LinkedEvent {
  id: string;
  event_type: string;
  severity: string;
  payload_summary: string | null;
  created_at: string;
  raw_details: any;
}

export default function IncidentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const { log: auditLog } = useAuditLog();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [events, setEvents] = useState<LinkedEvent[]>([]);
  const [newComment, setNewComment] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      const { data: inc } = await supabase.from("incidents").select("*").eq("id", id).single();
      if (inc) {
        setIncident(inc as Incident);
        setStatus(inc.status);
      }

      const { data: cmts } = await supabase
        .from("incident_comments")
        .select("*")
        .eq("incident_id", id)
        .order("created_at", { ascending: true });
      setComments((cmts as Comment[]) ?? []);

      const { data: linkedEvents } = await supabase
        .from("incident_events")
        .select("event_id, events(id, event_type, severity, payload_summary, created_at, raw_details)")
        .eq("incident_id", id);
      if (linkedEvents) {
        setEvents(linkedEvents.map((le: any) => le.events).filter(Boolean));
      }
    };
    fetch();
  }, [id]);

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return;
    const oldStatus = status;
    const { error } = await supabase.from("incidents").update({ status: newStatus as any }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      auditLog("transition", "incident", id, { from: oldStatus, to: newStatus });
      setStatus(newStatus);
      setIncident((prev) => prev ? { ...prev, status: newStatus } : null);
      toast.success("Status updated");
    }
  };

  const handleAddComment = async () => {
    if (!id || !user || !newComment.trim()) return;
    const { error } = await supabase.from("incident_comments").insert({
      incident_id: id,
      user_id: user.id,
      content: newComment.trim(),
    });
    if (error) toast.error(error.message);
    else {
      setNewComment("");
      const { data } = await supabase.from("incident_comments").select("*").eq("incident_id", id).order("created_at", { ascending: true });
      setComments((data as Comment[]) ?? []);
    }
  };

  if (!incident) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/incidents")}>
        <ArrowLeft className="mr-2 h-4 w-4" />Back to Incidents
      </Button>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{incident.title}</h1>
          <div className="flex gap-2 mt-2">
            <SeverityBadge severity={incident.severity} />
            <StatusBadge status={incident.status} />
          </div>
        </div>
        <Select value={status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="investigating">Investigating</SelectItem>
            <SelectItem value="mitigated">Mitigated</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {incident.description && (
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{incident.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Timeline: linked events */}
      <Card className="border-border bg-card">
        <CardHeader><CardTitle className="text-base">Event Timeline</CardTitle></CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No linked events</p>
          ) : (
            <div className="space-y-3">
              {events.map((evt) => (
                <div key={evt.id} className="flex gap-3 items-start border-l-2 border-border pl-4 py-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{evt.event_type}</span>
                      <SeverityBadge severity={evt.severity} />
                    </div>
                    {evt.payload_summary && <p className="text-xs text-muted-foreground mt-1">{evt.payload_summary}</p>}
                    <p className="text-xs text-muted-foreground font-mono mt-1">
                      {format(new Date(evt.created_at), "yyyy-MM-dd HH:mm:ss")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comments */}
      <Card className="border-border bg-card">
        <CardHeader><CardTitle className="text-base">Comments</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {comments.map((c) => (
            <div key={c.id} className="border border-border rounded-lg p-3">
              <p className="text-sm">{c.content}</p>
              <p className="text-xs text-muted-foreground mt-1 font-mono">
                {format(new Date(c.created_at), "MMM d, HH:mm")}
              </p>
            </div>
          ))}
          <div className="flex gap-2">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="min-h-[60px]"
            />
            <Button onClick={handleAddComment} size="sm" className="self-end">Post</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
