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


-- =============================================================
-- Phase A: audit_logs, policy_violations, incident/comment cols, log_audit fn
-- =============================================================

-- 1. audit_logs table
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Members can read audit logs for their workspace
CREATE POLICY "Members can view audit_logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

-- No direct insert/update/delete from clients — only via security-definer function

-- 2. policy_violations table
CREATE TABLE public.policy_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  policy_id uuid NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  violation_details jsonb DEFAULT '{}'::jsonb,
  severity event_severity NOT NULL DEFAULT 'warning'::event_severity,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.policy_violations ENABLE ROW LEVEL SECURITY;

-- Members can read violations for their workspace
CREATE POLICY "Members can view policy_violations"
  ON public.policy_violations FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

-- No direct client insert — service role or security-definer only

-- 3. Add columns to incidents
ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS assigned_to uuid,
  ADD COLUMN IF NOT EXISTS root_cause text,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz;

-- 4. Add comment_type to incident_comments
ALTER TABLE public.incident_comments
  ADD COLUMN IF NOT EXISTS comment_type text NOT NULL DEFAULT 'comment';

-- 5. log_audit security-definer function
CREATE OR REPLACE FUNCTION public.log_audit(
  _workspace_id uuid,
  _action text,
  _resource_type text,
  _resource_id uuid DEFAULT NULL,
  _details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (workspace_id, user_id, action, resource_type, resource_id, details)
  VALUES (_workspace_id, auth.uid(), _action, _resource_type, _resource_id, _details);
END;
$$;
