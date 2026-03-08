
-- Enums
CREATE TYPE public.workspace_role AS ENUM ('owner', 'admin', 'observer');
CREATE TYPE public.agent_environment AS ENUM ('dev', 'stage', 'prod');
CREATE TYPE public.event_severity AS ENUM ('info', 'warning', 'error', 'critical');
CREATE TYPE public.incident_status AS ENUM ('open', 'investigating', 'mitigated', 'closed');
CREATE TYPE public.incident_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- User roles (app-level)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Workspaces
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- Workspace members
CREATE TABLE public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.workspace_role NOT NULL DEFAULT 'observer',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- Security definer: check workspace membership
CREATE OR REPLACE FUNCTION public.is_workspace_member(_user_id UUID, _workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.workspace_members WHERE user_id = _user_id AND workspace_id = _workspace_id)
$$;

-- Security definer: check workspace role
CREATE OR REPLACE FUNCTION public.get_workspace_role(_user_id UUID, _workspace_id UUID)
RETURNS public.workspace_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.workspace_members WHERE user_id = _user_id AND workspace_id = _workspace_id
$$;

-- Workspace RLS
CREATE POLICY "Members can view their workspaces" ON public.workspaces FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), id));
CREATE POLICY "Authenticated users can create workspaces" ON public.workspaces FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "Owners can update workspaces" ON public.workspaces FOR UPDATE TO authenticated
  USING (public.get_workspace_role(auth.uid(), id) = 'owner');

-- Workspace members RLS
CREATE POLICY "Members can view workspace members" ON public.workspace_members FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Admins/owners can add members" ON public.workspace_members FOR INSERT TO authenticated
  WITH CHECK (
    public.get_workspace_role(auth.uid(), workspace_id) IN ('owner', 'admin')
    OR auth.uid() = user_id
  );
CREATE POLICY "Admins/owners can update members" ON public.workspace_members FOR UPDATE TO authenticated
  USING (public.get_workspace_role(auth.uid(), workspace_id) IN ('owner', 'admin'));
CREATE POLICY "Admins/owners can remove members" ON public.workspace_members FOR DELETE TO authenticated
  USING (public.get_workspace_role(auth.uid(), workspace_id) IN ('owner', 'admin'));

-- Agents
CREATE TABLE public.agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  environment public.agent_environment NOT NULL DEFAULT 'dev',
  owner_team TEXT,
  connection_config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view agents" ON public.agents FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Admins/owners can create agents" ON public.agents FOR INSERT TO authenticated
  WITH CHECK (public.get_workspace_role(auth.uid(), workspace_id) IN ('owner', 'admin'));
CREATE POLICY "Admins/owners can update agents" ON public.agents FOR UPDATE TO authenticated
  USING (public.get_workspace_role(auth.uid(), workspace_id) IN ('owner', 'admin'));
CREATE POLICY "Admins/owners can delete agents" ON public.agents FOR DELETE TO authenticated
  USING (public.get_workspace_role(auth.uid(), workspace_id) IN ('owner', 'admin'));

-- Events
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  session_id TEXT,
  event_type TEXT NOT NULL,
  severity public.event_severity NOT NULL DEFAULT 'info',
  payload_summary TEXT,
  raw_details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view events" ON public.events FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Admins/owners can create events" ON public.events FOR INSERT TO authenticated
  WITH CHECK (public.get_workspace_role(auth.uid(), workspace_id) IN ('owner', 'admin'));

-- Incidents
CREATE TABLE public.incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  severity public.incident_severity NOT NULL DEFAULT 'medium',
  status public.incident_status NOT NULL DEFAULT 'open',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view incidents" ON public.incidents FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Admins/owners can create incidents" ON public.incidents FOR INSERT TO authenticated
  WITH CHECK (public.get_workspace_role(auth.uid(), workspace_id) IN ('owner', 'admin'));
CREATE POLICY "Admins/owners can update incidents" ON public.incidents FOR UPDATE TO authenticated
  USING (public.get_workspace_role(auth.uid(), workspace_id) IN ('owner', 'admin'));

-- Incident-agents junction
CREATE TABLE public.incident_agents (
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  PRIMARY KEY (incident_id, agent_id)
);
ALTER TABLE public.incident_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view incident_agents" ON public.incident_agents FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.incidents i WHERE i.id = incident_id AND public.is_workspace_member(auth.uid(), i.workspace_id)
  ));
CREATE POLICY "Admins/owners can manage incident_agents" ON public.incident_agents FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.incidents i WHERE i.id = incident_id AND public.get_workspace_role(auth.uid(), i.workspace_id) IN ('owner', 'admin')
  ));

-- Incident-events junction
CREATE TABLE public.incident_events (
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  PRIMARY KEY (incident_id, event_id)
);
ALTER TABLE public.incident_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view incident_events" ON public.incident_events FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.incidents i WHERE i.id = incident_id AND public.is_workspace_member(auth.uid(), i.workspace_id)
  ));
CREATE POLICY "Admins/owners can manage incident_events" ON public.incident_events FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.incidents i WHERE i.id = incident_id AND public.get_workspace_role(auth.uid(), i.workspace_id) IN ('owner', 'admin')
  ));

-- Incident comments
CREATE TABLE public.incident_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.incident_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view comments" ON public.incident_comments FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.incidents i WHERE i.id = incident_id AND public.is_workspace_member(auth.uid(), i.workspace_id)
  ));
CREATE POLICY "Members can create comments" ON public.incident_comments FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND EXISTS (
      SELECT 1 FROM public.incidents i WHERE i.id = incident_id AND public.is_workspace_member(auth.uid(), i.workspace_id)
    )
  );

-- Policies
CREATE TABLE public.policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  rule_config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view policies" ON public.policies FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Admins/owners can create policies" ON public.policies FOR INSERT TO authenticated
  WITH CHECK (public.get_workspace_role(auth.uid(), workspace_id) IN ('owner', 'admin'));
CREATE POLICY "Admins/owners can update policies" ON public.policies FOR UPDATE TO authenticated
  USING (public.get_workspace_role(auth.uid(), workspace_id) IN ('owner', 'admin'));
CREATE POLICY "Admins/owners can delete policies" ON public.policies FOR DELETE TO authenticated
  USING (public.get_workspace_role(auth.uid(), workspace_id) IN ('owner', 'admin'));

-- Agent-policies junction
CREATE TABLE public.agent_policies (
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  policy_id UUID NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE,
  PRIMARY KEY (agent_id, policy_id)
);
ALTER TABLE public.agent_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view agent_policies" ON public.agent_policies FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.agents a WHERE a.id = agent_id AND public.is_workspace_member(auth.uid(), a.workspace_id)
  ));
CREATE POLICY "Admins/owners can manage agent_policies" ON public.agent_policies FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.agents a WHERE a.id = agent_id AND public.get_workspace_role(auth.uid(), a.workspace_id) IN ('owner', 'admin')
  ));
CREATE POLICY "Admins/owners can delete agent_policies" ON public.agent_policies FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.agents a WHERE a.id = agent_id AND public.get_workspace_role(auth.uid(), a.workspace_id) IN ('owner', 'admin')
  ));

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON public.agents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON public.incidents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_policies_updated_at BEFORE UPDATE ON public.policies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to auto-create workspace for new user
CREATE OR REPLACE FUNCTION public.handle_new_user_workspace()
RETURNS TRIGGER AS $$
DECLARE
  ws_id UUID;
BEGIN
  INSERT INTO public.workspaces (name, slug)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)) || '''s Workspace',
          NEW.id::TEXT)
  RETURNING id INTO ws_id;
  
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (ws_id, NEW.id, 'owner');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created_workspace
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_workspace();

-- Indexes for performance
CREATE INDEX idx_events_workspace_created ON public.events(workspace_id, created_at DESC);
CREATE INDEX idx_events_agent ON public.events(agent_id);
CREATE INDEX idx_incidents_workspace_status ON public.incidents(workspace_id, status);
CREATE INDEX idx_incidents_workspace_created ON public.incidents(workspace_id, created_at DESC);
CREATE INDEX idx_agents_workspace ON public.agents(workspace_id);
CREATE INDEX idx_workspace_members_user ON public.workspace_members(user_id);
CREATE INDEX idx_policies_workspace ON public.policies(workspace_id);
