# AgentOps — AI Agent Governance Console

> Monitor, govern, and audit your AI agents in real time. Define policies, detect violations, investigate incidents, and maintain a complete audit trail — all from a single console.

[![Tech Stack](https://img.shields.io/badge/React_18-TypeScript-blue)](https://react.dev)
[![UI](https://img.shields.io/badge/Tailwind_CSS-shadcn/ui-06b6d4)](https://tailwindcss.com)
[![Backend](https://img.shields.io/badge/Supabase-Edge_Functions-3ecf8e)](https://supabase.com)
[![Build](https://img.shields.io/badge/Vite-5-646cff)](https://vitejs.dev)
[![License](https://img.shields.io/badge/License-TBD-lightgrey)](#license)

---

## Table of Contents

- [Overview](#overview)
- [Architecture Overview](#architecture-overview)
- [Getting Started](#getting-started)
- [Core Workflows](#core-workflows)
- [Deployment](#deployment)
- [Configuration & Secrets](#configuration--secrets)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

**Detailed documentation:**

| Document | Description |
|---|---|
| [`docs/architecture.md`](docs/architecture.md) | System diagram, data model, security boundaries |
| [`docs/getting-started.md`](docs/getting-started.md) | Full local development setup guide |
| [`docs/usage-guide.md`](docs/usage-guide.md) | End-to-end operator guide for the console |
| [`docs/api-reference.md`](docs/api-reference.md) | `ingest-events` edge function API reference |
| [`docs/configuration.md`](docs/configuration.md) | Environment variables, secrets, auth settings |
| [`docs/deployment.md`](docs/deployment.md) | Production deployment instructions |
| [`docs/troubleshooting.md`](docs/troubleshooting.md) | Common issues and fixes |
| [`docs/contributing.md`](docs/contributing.md) | Contributor guidelines |

---

## Overview

### What It Does

AgentOps is a governance console for teams that deploy AI agents (chatbots, copilots, autonomous tools). It provides:

- **Agent Registry** — Register and organize AI agents across environments (dev / stage / prod).
- **Policy Engine** — Define governance rules (PII detection, blocked topics, response length limits) and attach them to agents.
- **Real-time Event Ingestion** — Receive agent activity events via a REST API, automatically evaluate them against attached policies, and log violations.
- **Incident Management** — Create, investigate, and resolve incidents with a full lifecycle (Open → Investigating → Mitigated → Closed), mandatory transition comments, and root-cause tracking.
- **Audit Trail** — Every action (create, read, update, transition) is logged with user, timestamp, and details.
- **Multi-workspace** — Each user gets an isolated workspace with role-based access (Owner / Admin / Observer).

### Who It's For

- **AI/ML platform teams** responsible for governing agent behavior at scale.
- **Compliance & security teams** auditing AI agent interactions.
- **Developers** who need visibility into what their agents are doing in production.

### Core Concepts

| Concept | Description |
|---|---|
| **Workspace** | Isolated tenant. All data is scoped to a workspace. |
| **Agent** | A registered AI service (e.g., "Customer Support Bot"). |
| **Policy** | A set of governance rules (JSON config) attached to agents. |
| **Event** | A telemetry record ingested from an agent via the API. |
| **Violation** | A policy rule breach detected during event ingestion. |
| **Incident** | An investigation record with lifecycle, comments, and root-cause. |
| **Audit Log** | An append-only record of every action in the workspace. |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (SPA)                       │
│  React 18 · TypeScript · Vite · Tailwind · shadcn/ui    │
│                                                          │
│  Pages: Dashboard, Agents, Events, Incidents,            │
│         Policies, Audit Log, Settings                    │
│  Contexts: AuthContext, WorkspaceContext                  │
│  Routing: react-router-dom (protected routes)            │
└──────────────────────┬──────────────────────────────────┘
                       │ Supabase JS Client (RLS-enforced)
                       ▼
┌─────────────────────────────────────────────────────────┐
│                 Supabase (Backend)                        │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  PostgreSQL   │  │  Auth (JWT)  │  │ Edge Functions│  │
│  │  + RLS        │  │  + Profiles  │  │ ingest-events │  │
│  └──────────────┘  └──────────────┘  └───────────────┘  │
│                                                          │
│  Tables: workspaces, agents, policies, events,           │
│          incidents, policy_violations, audit_logs,        │
│          api_keys, profiles, workspace_members,           │
│          user_roles, agent_policies, incident_comments,   │
│          incident_agents, incident_events                 │
│                                                          │
│  Security: Row-Level Security on every table              │
│  Functions: is_workspace_member(), get_workspace_role(),  │
│             has_role(), validate_api_key(), log_audit()   │
└─────────────────────────────────────────────────────────┘
```

External agents POST events to the `ingest-events` edge function using an API key. The function validates the key, inserts the event, evaluates attached policies, records violations, and writes to the audit log.

→ See [`docs/architecture.md`](docs/architecture.md) for the full deep-dive.

---

## Getting Started

### Prerequisites

| Tool | Version |
|---|---|
| Node.js | ≥ 18 |
| npm or Bun | Latest |
| Git | Any |

### Quick Start

```bash
# 1. Clone the repository
git clone <repo-url>
cd agentops

# 2. Install dependencies
npm install

# 3. Start the dev server
npm run dev
```

The app will be available at `http://localhost:5173`.

### Environment Variables

The following variables are automatically provided when running via Lovable Cloud:

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public key |

→ See [`docs/configuration.md`](docs/configuration.md) for the full reference.

### Running Tests

```bash
npm test            # Run once
npm run test:watch  # Watch mode
```

---

## Core Workflows

### 1. Register & Sign In

1. Navigate to `/signup` and create an account.
2. A workspace is automatically created for you.
3. You're redirected to the Dashboard.

### 2. Register an Agent

1. Go to **Agents → + Add Agent**.
2. Provide a name, description, environment (dev/stage/prod), and owner team.
3. The agent appears in your registry.

### 3. Define a Policy

1. Go to **Policies → + Add Policy**.
2. Provide a name, description, and rule configuration (JSON).
3. Click into the policy detail to edit rules and attach agents.

**Example rule configuration:**
```json
{
  "rules": [
    { "type": "pii_detection", "params": { "categories": ["email", "ssn"] } },
    { "type": "max_response_length", "params": { "max_chars": 2000 } },
    { "type": "blocked_topics", "params": { "topics": ["competitor_name"] } }
  ]
}
```

### 4. Ingest Events

Send agent activity to the `ingest-events` edge function:

```bash
curl -X POST \
  https://<project-id>.supabase.co/functions/v1/ingest-events \
  -H "Content-Type: application/json" \
  -H "x-api-key: <your-api-key>" \
  -d '{
    "agent_id": "<agent-uuid>",
    "event_type": "chat_response",
    "severity": "info",
    "payload_summary": "User asked about refund policy",
    "raw_details": { "response": "Your SSN is 123-45-6789" }
  }'
```

The function returns any policy violations detected:
```json
{
  "success": true,
  "event_id": "...",
  "violations": [
    { "policy": "No PII Exposure", "rule": "pii_detection", "message": "PII detected: ssn" }
  ]
}
```

→ See [`docs/api-reference.md`](docs/api-reference.md) for the full endpoint reference.

### 5. Investigate Incidents

1. Go to **Incidents → + Create Incident**.
2. Open the incident detail to see the status transition bar.
3. Transition through **Open → Investigating → Mitigated → Closed**, with a mandatory comment at each step.
4. When closing, provide a **root cause**.
5. The full timeline (status changes + comments + linked events) is visible on the detail page.

### 6. Review the Audit Log

Go to **Audit Log** to see every action in your workspace, filterable by action type, resource type, and date range.

---

## Deployment

AgentOps is deployed via **Lovable Cloud**, which handles:

- Frontend hosting and CDN
- Database, auth, and edge functions
- Automatic SSL and custom domain support

Edge functions deploy automatically on push. Frontend deploys require clicking **Publish → Update** in the Lovable editor.

→ See [`docs/deployment.md`](docs/deployment.md) for details.

---

## Configuration & Secrets

| Secret / Variable | Where Used | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | Frontend | Backend project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Frontend | Public anon key |
| `SUPABASE_URL` | Edge Functions | Internal backend URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Functions | Privileged DB access |

**Never commit private keys to the codebase.** All secrets are managed through Lovable Cloud's secrets manager.

→ See [`docs/configuration.md`](docs/configuration.md) for the full reference.

---

## How to Demo in 3 Minutes

> This script walks through both core journeys: UI incident lifecycle and API event ingestion.

1. **Sign up** — Navigate to `/signup`. Enter a name, email, and password. After confirming your email (or with auto-confirm enabled), you'll land on the **Dashboard**.

2. **Create an Agent** — Go to **Agents** → click **+ Add Agent**. Name it `Demo Bot`, set environment to `prod`, and click **Create Agent**. Note the agent appears in the table.

3. **Create a Policy** — Go to **Policies** → click **+ Add Policy**. Name it `PII Guard`. Paste this rule config:
   ```json
   { "rules": [{ "type": "pii_detection", "params": { "categories": ["email", "ssn"] } }] }
   ```
   Click **Create Policy**.

4. **Create an Incident** — Go to **Incidents** → click **+ Create Incident**. Title it `SSN Leak in Chat`, set severity to `High`, and click **Create**.

5. **Walk the Incident Lifecycle** — Click into the incident. Use the status bar buttons to transition:
   - **Open → Investigating**: Add comment "Starting investigation".
   - **Investigating → Mitigated**: Add comment "Blocked PII in responses".
   - **Mitigated → Closed**: Add comment "Deployed fix", enter root cause "Agent prompt missing PII filter". Observe the full timeline with status change entries.

6. **Check Audit Log** — Go to **Audit Log**. Verify entries for `create` (agent, policy, incident) and `transition` (incident status changes) are recorded with timestamps.

7. **Verify Dashboard** — Return to **Dashboard**. Confirm KPI cards show updated counts and the Recent Activity feed reflects your actions.

**API ingestion demo** (optional, requires an API key in the `api_keys` table):
```bash
curl -X POST https://<project-url>/functions/v1/ingest-events \
  -H "Content-Type: application/json" \
  -H "x-api-key: <your-key>" \
  -d '{"agent_id":"<agent-uuid>","event_type":"chat_response","severity":"info","raw_details":{"response":"SSN: 123-45-6789"}}'
```
The response will include a `violations` array showing the PII detection hit.

---

## Troubleshooting

| Problem | Quick Fix |
|---|---|
| "Permission denied" on any table | Ensure you're logged in and are a member of the workspace. Check RLS policies. |
| Events not appearing after ingest | Verify the API key is valid (not revoked) and the `agent_id` belongs to the workspace. |
| Dashboard shows 0 for all KPIs | Workspace may have no data yet. Create agents, policies, and incidents to populate. |
| Email confirmation required | Users must verify their email before signing in (default behavior). |

→ See [`docs/troubleshooting.md`](docs/troubleshooting.md) for more.

---

## Contributing

This project is currently developed within Lovable. To contribute:

1. Fork or remix the project.
2. Follow the code style enforced by ESLint (`npm run lint`).
3. Write tests for new features (`npm test`).
4. Submit changes via pull request or Lovable's collaboration features.

→ See [`docs/contributing.md`](docs/contributing.md) for detailed guidelines.

---

## License

> **TODO:** Decide on a license. This section will be updated once a license is chosen.

---

<p align="center">
  Built with <a href="https://lovable.dev">Lovable</a>
</p>
