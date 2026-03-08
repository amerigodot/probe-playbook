

# AI Agent Quality & Incident Console

## Overview
A full-stack monitoring dashboard for enterprises to govern AI agents in production. Dark theme (Datadog/Grafana-style), built with React + Tailwind + Supabase.

---

## Phase 1: Supabase Backend Setup

### Authentication
- Email/password auth via Supabase Auth

### Database Schema
- **workspaces** — id, name, slug, created_at
- **workspace_members** — workspace_id, user_id, role (owner/admin/observer), joined_at
- **profiles** — id (FK to auth.users), display_name, avatar_url
- **agents** — id, workspace_id, name, description, environment (dev/stage/prod), owner_team, connection_config (JSONB), created_at
- **events** — id, workspace_id, agent_id, session_id, event_type, severity, payload_summary, raw_details (JSONB), created_at
- **incidents** — id, workspace_id, title, description, severity, status (open/investigating/mitigated/closed), tags (text[]), created_at, updated_at
- **incident_agents** — incident_id, agent_id (junction table)
- **incident_events** — incident_id, event_id (junction table)
- **incident_comments** — id, incident_id, user_id, content, created_at
- **policies** — id, workspace_id, name, description, rule_config (JSONB), created_at
- **agent_policies** — agent_id, policy_id (junction table)
- **user_roles** — id, user_id, role (app_role enum: admin/moderator/user) for app-level roles

### Row-Level Security
- All tables scoped to workspace membership via security definer functions
- Observers: read-only; Admins/Owners: full CRUD

---

## Phase 2: Auth & Workspace UI

### Login / Signup Pages
- Email/password forms with dark theme styling
- Password reset flow with dedicated /reset-password page

### Workspace Switcher
- Top bar dropdown showing current workspace
- Ability to switch between workspaces the user belongs to
- Create new workspace option

---

## Phase 3: Dashboard Layout & Navigation

### Layout
- **Left Sidebar** — collapsible, with icon-only mini mode. Navigation items: Dashboard, Agents, Events, Incidents, Policies, Settings. Active route highlighted.
- **Top Bar** — workspace name + switcher, user avatar + dropdown (profile, logout)
- **Main Content Area** — routed content

### Dark Theme
- Deep navy/charcoal backgrounds, subtle borders, accent colors for severity levels (red for critical, amber for warning, green for healthy)

---

## Phase 4: Main Dashboard Page

### KPI Cards (top row grid)
- **Total Agents** — count from agents table
- **Events (24h)** — count of events in last 24 hours
- **Open Incidents** — count where status = open or investigating
- **Failing Policies** — count of policies with recent violations

### Recent Incidents Table
- 10 most recent incidents
- Columns: title, severity (badge), status (badge), impacted agents, created date
- Filters: severity dropdown, status dropdown
- Click row to navigate to incident detail

---

## Phase 5: Core Module Pages (scaffold)

### Agents Page
- Table listing all agents with name, environment, owner team, policy count
- Add/edit agent dialog

### Events Page
- Searchable/filterable event stream table with severity color coding
- Click to view raw JSON details in a side panel

### Incidents Page
- Full incidents list with filters
- Incident detail view with timeline of linked events and comments
- "Reverse deterministic" timeline: chronological view of all events/inputs/outputs leading to the incident

### Policies Page
- List of policy rules with name, type, attached agent count
- Add/edit policy with JSON config editor

### Settings Page
- Workspace settings (name, members, roles)
- Invite members by email

---

## Seed Data
- Pre-populate with sample agents, events, incidents, and policies so the dashboard looks populated on first login

