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
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuditLog } from "@/hooks/useAuditLog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SeverityBadge } from "@/components/SeverityBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MessageSquare, ArrowRight, Activity, User } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ---------- Types ----------

interface Incident {
  id: string;
  title: string;
  description: string | null;
  severity: string;
  status: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  assigned_to: string | null;
  root_cause: string | null;
  resolved_at: string | null;
}

interface TimelineComment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  comment_type: string;
}

interface LinkedEvent {
  id: string;
  event_type: string;
  severity: string;
  payload_summary: string | null;
  created_at: string;
  raw_details: any;
}

interface WorkspaceMember {
  user_id: string;
  role: string;
  profiles: { display_name: string | null } | null;
}

// Unified timeline item
interface TimelineItem {
  id: string;
  type: "comment" | "status_change" | "event";
  created_at: string;
  data: any;
}

// ---------- Status flow ----------
import { STATUS_ORDER, STATUS_TRANSITIONS } from "@/lib/incident-status";

// ---------- Component ----------

export default function IncidentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const { log: auditLog } = useAuditLog();

  const [incident, setIncident] = useState<Incident | null>(null);
  const [comments, setComments] = useState<TimelineComment[]>([]);
  const [events, setEvents] = useState<LinkedEvent[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [newComment, setNewComment] = useState("");

  // Transition modal state
  const [transitionTarget, setTransitionTarget] = useState<string | null>(null);
  const [transitionComment, setTransitionComment] = useState("");
  const [rootCauseInput, setRootCauseInput] = useState("");

  // ---------- Data fetching ----------

  const fetchAll = async () => {
    if (!id) return;

    const [incRes, cmtRes, evtRes] = await Promise.all([
      supabase.from("incidents").select("*").eq("id", id).single(),
      supabase
        .from("incident_comments")
        .select("id, content, created_at, user_id, comment_type")
        .eq("incident_id", id)
        .order("created_at", { ascending: true }),
      supabase
        .from("incident_events")
        .select("event_id, events(id, event_type, severity, payload_summary, created_at, raw_details)")
        .eq("incident_id", id),
    ]);

    if (incRes.data) {
      setIncident(incRes.data as unknown as Incident);
    }
    setComments((cmtRes.data as unknown as TimelineComment[]) ?? []);
    if (evtRes.data) {
      setEvents(evtRes.data.map((le: any) => le.events).filter(Boolean));
    }
  };

  const fetchMembers = async () => {
    if (!currentWorkspace) return;
    const { data } = await supabase
      .from("workspace_members")
      .select("user_id, role, profiles(display_name)")
      .eq("workspace_id", currentWorkspace.id);
    setMembers((data as unknown as WorkspaceMember[]) ?? []);
  };

  useEffect(() => {
    fetchAll();
    if (id) {
      auditLog("read", "incident", id, { view: "incident_detail" });
    }
  }, [id]);

  useEffect(() => {
    fetchMembers();
  }, [currentWorkspace]);

  // ---------- Actions ----------

  const openTransitionModal = (targetStatus: string) => {
    setTransitionTarget(targetStatus);
    setTransitionComment("");
    setRootCauseInput(incident?.root_cause || "");
  };

  const handleTransition = async () => {
    if (!id || !transitionTarget || !transitionComment.trim()) {
      toast.error("A comment is required when changing status");
      return;
    }

    if (transitionTarget === "closed" && !rootCauseInput.trim()) {
      toast.error("Root cause is required when closing an incident");
      return;
    }

    const oldStatus = incident?.status || "";
    const updatePayload: Record<string, any> = { status: transitionTarget };
    if (transitionTarget === "closed") {
      updatePayload.root_cause = rootCauseInput.trim();
      updatePayload.resolved_at = new Date().toISOString();
    }
    // Re-opening clears resolved_at
    if (transitionTarget === "open") {
      updatePayload.resolved_at = null;
    }

    const { error } = await supabase
      .from("incidents")
      .update(updatePayload as any)
      .eq("id", id);

    if (error) {
      toast.error(error.message);
      return;
    }

    // Insert status_change comment
    await supabase.from("incident_comments").insert({
      incident_id: id,
      user_id: user!.id,
      content: transitionComment.trim(),
      comment_type: "status_change",
    } as any);

    auditLog("transition", "incident", id, {
      from: oldStatus,
      to: transitionTarget,
      comment: transitionComment.trim().slice(0, 100),
    });

    toast.success(`Status changed to ${transitionTarget}`);
    setTransitionTarget(null);
    fetchAll();
  };

  const handleAddComment = async () => {
    if (!id || !user || !newComment.trim()) return;
    const { error } = await supabase.from("incident_comments").insert({
      incident_id: id,
      user_id: user.id,
      content: newComment.trim(),
      comment_type: "comment",
    } as any);
    if (error) toast.error(error.message);
    else {
      auditLog("create", "incident", id, { comment: newComment.trim().slice(0, 100) });
      setNewComment("");
      fetchAll();
    }
  };

  const handleAssign = async (userId: string) => {
    if (!id) return;
    const assignValue = userId === "unassigned" ? null : userId;
    const { error } = await supabase
      .from("incidents")
      .update({ assigned_to: assignValue } as any)
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      auditLog("update", "incident", id, { assigned_to: assignValue });
      toast.success("Assignment updated");
      fetchAll();
    }
  };

  // ---------- Build unified timeline ----------

  const buildTimeline = (): TimelineItem[] => {
    const items: TimelineItem[] = [];

    comments.forEach((c) => {
      items.push({
        id: c.id,
        type: c.comment_type === "status_change" ? "status_change" : "comment",
        created_at: c.created_at,
        data: c,
      });
    });

    events.forEach((e) => {
      items.push({
        id: e.id,
        type: "event",
        created_at: e.created_at,
        data: e,
      });
    });

    items.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    return items;
  };

  const getMemberName = (userId: string) => {
    const m = members.find((m) => m.user_id === userId);
    return m?.profiles?.display_name || userId.slice(0, 8) + "…";
  };

  // ---------- Render ----------

  if (!incident) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const allowedTransitions = STATUS_TRANSITIONS[incident.status] || [];
  const timeline = buildTimeline();

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/incidents")}>
        <ArrowLeft className="mr-2 h-4 w-4" />Back to Incidents
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{incident.title}</h1>
          <div className="flex flex-wrap gap-2 mt-2">
            <SeverityBadge severity={incident.severity} />
            <StatusBadge status={incident.status} />
            {incident.assigned_to && (
              <Badge variant="outline" className="text-xs font-mono gap-1">
                <User className="h-3 w-3" />
                {getMemberName(incident.assigned_to)}
              </Badge>
            )}
          </div>
        </div>

        {/* Assign selector */}
        <Select
          value={incident.assigned_to || "unassigned"}
          onValueChange={handleAssign}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Assign to…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {members.map((m) => (
              <SelectItem key={m.user_id} value={m.user_id}>
                {m.profiles?.display_name || m.user_id.slice(0, 8)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Status transition bar */}
      <Card className="border-border bg-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground font-medium">Status:</span>
            <div className="flex items-center gap-1">
              {STATUS_ORDER.map((s, i) => {
                const isCurrent = s === incident.status;
                const isPast = STATUS_ORDER.indexOf(s) < STATUS_ORDER.indexOf(incident.status as any);
                return (
                  <div key={s} className="flex items-center gap-1">
                    {i > 0 && (
                      <ArrowRight className={cn("h-3 w-3", isPast || isCurrent ? "text-primary" : "text-muted-foreground/30")} />
                    )}
                    <span
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-mono capitalize transition-colors",
                        isCurrent
                          ? "bg-primary text-primary-foreground font-semibold"
                          : isPast
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {s}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="ml-auto flex gap-2">
              {allowedTransitions.map((t) => (
                <Button key={t} size="sm" variant="outline" onClick={() => openTransitionModal(t)}>
                  Move to {t}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Description & root cause */}
      {(incident.description || incident.root_cause) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {incident.description && (
            <Card className="border-border bg-card">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Description</CardTitle></CardHeader>
              <CardContent><p className="text-sm">{incident.description}</p></CardContent>
            </Card>
          )}
          {incident.root_cause && (
            <Card className="border-border bg-card">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Root Cause</CardTitle></CardHeader>
              <CardContent><p className="text-sm">{incident.root_cause}</p></CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Unified Timeline */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet</p>
          ) : (
            <div className="relative pl-6 space-y-0">
              {/* Vertical line */}
              <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />

              {timeline.map((item) => (
                <div key={item.id} className="relative flex gap-3 pb-6 last:pb-0">
                  {/* Dot */}
                  <div
                    className={cn(
                      "absolute -left-6 top-1.5 h-[10px] w-[10px] rounded-full border-2",
                      item.type === "status_change"
                        ? "bg-severity-warning border-severity-warning"
                        : item.type === "event"
                        ? "bg-severity-info border-severity-info"
                        : "bg-muted-foreground border-muted-foreground"
                    )}
                  />

                  <div className="flex-1 min-w-0">
                    {item.type === "status_change" && (
                      <div className="rounded-lg border border-severity-warning/20 bg-severity-warning/5 p-3">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                          <ArrowRight className="h-3 w-3 text-severity-warning" />
                          <span className="font-medium text-severity-warning">Status Change</span>
                          <span>by {getMemberName(item.data.user_id)}</span>
                        </div>
                        <p className="text-sm">{item.data.content}</p>
                      </div>
                    )}

                    {item.type === "comment" && (
                      <div className="rounded-lg border border-border p-3">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                          <MessageSquare className="h-3 w-3" />
                          <span>{getMemberName(item.data.user_id)}</span>
                        </div>
                        <p className="text-sm">{item.data.content}</p>
                      </div>
                    )}

                    {item.type === "event" && (
                      <div className="rounded-lg border border-severity-info/20 bg-severity-info/5 p-3">
                        <div className="flex items-center gap-2">
                          <Activity className="h-3 w-3 text-severity-info" />
                          <span className="font-mono text-sm">{item.data.event_type}</span>
                          <SeverityBadge severity={item.data.severity} />
                        </div>
                        {item.data.payload_summary && (
                          <p className="text-xs text-muted-foreground mt-1">{item.data.payload_summary}</p>
                        )}
                      </div>
                    )}

                    <p className="text-[10px] text-muted-foreground font-mono mt-1">
                      {format(new Date(item.created_at), "yyyy-MM-dd HH:mm:ss")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add comment */}
          <div className="flex gap-2 mt-6 pt-4 border-t border-border">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment…"
              className="min-h-[60px]"
            />
            <Button onClick={handleAddComment} size="sm" className="self-end">
              Post
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transition Modal */}
      <Dialog open={!!transitionTarget} onOpenChange={(open) => !open && setTransitionTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Move to <span className="capitalize text-primary">{transitionTarget}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Comment <span className="text-severity-critical">*</span></Label>
              <Textarea
                value={transitionComment}
                onChange={(e) => setTransitionComment(e.target.value)}
                placeholder="Explain why you're changing the status…"
                className="min-h-[80px]"
              />
            </div>

            {transitionTarget === "closed" && (
              <div className="space-y-2">
                <Label>Root Cause <span className="text-severity-critical">*</span></Label>
                <Textarea
                  value={rootCauseInput}
                  onChange={(e) => setRootCauseInput(e.target.value)}
                  placeholder="Describe the root cause of this incident…"
                  className="min-h-[80px]"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setTransitionTarget(null)}>Cancel</Button>
            <Button onClick={handleTransition}>
              Confirm Transition
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
