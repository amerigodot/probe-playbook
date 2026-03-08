import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

type AuditAction = "create" | "update" | "delete" | "read" | "transition";
type ResourceType = "agent" | "incident" | "policy" | "event" | "workspace" | "member";

export function useAuditLog() {
  const { currentWorkspace } = useWorkspace();

  const log = useCallback(
    async (
      action: AuditAction,
      resourceType: ResourceType,
      resourceId?: string,
      details?: Record<string, unknown>
    ) => {
      if (!currentWorkspace) return;
      try {
        await supabase.rpc("log_audit", {
          _workspace_id: currentWorkspace.id,
          _action: action,
          _resource_type: resourceType,
          _resource_id: resourceId ?? null,
          _details: details ?? {},
        });
      } catch (err) {
        // Audit logging should never block the user flow
        console.warn("Audit log failed:", err);
      }
    },
    [currentWorkspace]
  );

  return { log };
}
