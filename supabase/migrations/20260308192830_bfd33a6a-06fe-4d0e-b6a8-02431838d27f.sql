
-- API keys table for workspace-scoped external authentication
CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  key_hash text NOT NULL,
  label text NOT NULL DEFAULT 'Default',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Only admins/owners can manage API keys
CREATE POLICY "Admins/owners can view api_keys"
  ON public.api_keys FOR SELECT TO authenticated
  USING (get_workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['owner'::workspace_role, 'admin'::workspace_role]));

CREATE POLICY "Admins/owners can create api_keys"
  ON public.api_keys FOR INSERT TO authenticated
  WITH CHECK (get_workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['owner'::workspace_role, 'admin'::workspace_role]));

CREATE POLICY "Admins/owners can update api_keys"
  ON public.api_keys FOR UPDATE TO authenticated
  USING (get_workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['owner'::workspace_role, 'admin'::workspace_role]));

-- Function to validate an API key and return the workspace_id
CREATE OR REPLACE FUNCTION public.validate_api_key(_key_hash text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT workspace_id FROM public.api_keys
  WHERE key_hash = _key_hash AND revoked_at IS NULL
  LIMIT 1;
$$;
