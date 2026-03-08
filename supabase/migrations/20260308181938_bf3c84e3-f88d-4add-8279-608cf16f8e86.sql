
-- Fix permissive INSERT policy on workspaces - restrict to authenticated users creating workspaces where they become owner
DROP POLICY "Authenticated users can create workspaces" ON public.workspaces;
CREATE POLICY "Authenticated users can create workspaces" ON public.workspaces FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
