# Usage Guide

> End-to-end guide for operating the AgentOps console.

---

## Table of Contents

- [Dashboard Overview](#dashboard-overview)
- [Managing Agents](#managing-agents)
- [Defining Policies](#defining-policies)
- [Ingesting Events via API](#ingesting-events-via-api)
- [Investigating Incidents](#investigating-incidents)
- [Audit Log & Compliance](#audit-log--compliance)
- [Workspace Settings](#workspace-settings)

---

## Dashboard Overview

The Dashboard (`/`) displays four KPI cards and two data panels:

- **Total Agents** — Count of registered agents in the workspace.
- **Events (24h)** — Events ingested in the last 24 hours.
- **Open Incidents** — Incidents not yet closed.
- **Violations (24h)** — Policy violations detected in the last 24 hours.
- **Recent Incidents** — Table of the 10 most recent incidents with severity/status filters.
- **Recent Activity** — Sidebar feed of the last 8 audit log entries.

---

## Managing Agents

### Creating an Agent

1. Navigate to **Agents** in the sidebar.
2. Click **+ Add Agent**.
3. Fill in:
   - **Name** — A descriptive identifier (e.g., "Customer Support Bot").
   - **Description** — What the agent does.
   - **Environment** — `Development`, `Staging`, or `Production`.
   - **Owner Team** — The team responsible for this agent.
4. Click **Create Agent**.

### Viewing Agents

- The Agents page lists all agents in the current workspace with environment badges and descriptions.

---

## Defining Policies

### Creating a Policy

1. Navigate to **Policies** in the sidebar.
2. Click **+ Add Policy**.
3. Fill in:
   - **Name** — e.g., "No PII Exposure".
   - **Description** — What this policy enforces.
   - **Rule Configuration (JSON)** — The rules to evaluate. See below.
4. Click **Create Policy**.

### Rule Configuration Schema

```json
{
  "rules": [
    {
      "type": "pii_detection",
      "params": {
        "categories": ["email", "ssn", "phone", "credit_card"]
      }
    },
    {
      "type": "max_response_length",
      "params": {
        "max_chars": 2000
      }
    },
    {
      "type": "blocked_topics",
      "params": {
        "topics": ["competitor_x", "internal_roadmap"]
      }
    }
  ]
}
```

### Policy Detail Page

Click a policy row to access the detail view, where you can:

- **Edit the rule configuration** JSON and save.
- **Attach/detach agents** — Select agents to be governed by this policy.
- **View recent violations** — See a table of violations linked to this policy.

---

## Ingesting Events via API

External AI agents send telemetry to the `ingest-events` edge function.

### Authentication

Events are authenticated via an **API key** passed in the `x-api-key` header. API keys are managed in the Settings page (future feature) and stored as SHA-256 hashes in the `api_keys` table.

### Request Format

```bash
POST /functions/v1/ingest-events
Content-Type: application/json
x-api-key: <your-api-key>

{
  "agent_id": "<uuid>",
  "event_type": "chat_response",
  "severity": "info",           // info | warning | error | critical
  "session_id": "session-123",  // optional
  "payload_summary": "User asked about refund policy",  // optional
  "raw_details": {              // optional, arbitrary JSON
    "input": "What is the refund policy?",
    "response": "Our refund policy is..."
  }
}
```

### Response

```json
{
  "success": true,
  "event_id": "abc-123",
  "violations": [
    {
      "policy": "No PII Exposure",
      "rule": "pii_detection",
      "message": "PII detected: email, ssn"
    }
  ]
}
```

→ See [`api-reference.md`](api-reference.md) for the full endpoint specification.

---

## Investigating Incidents

### Creating an Incident

1. Go to **Incidents → + Create Incident**.
2. Provide a title, description, and severity (Low / Medium / High / Critical).

### Incident Lifecycle

Each incident follows a strict state machine:

```
Open → Investigating → Mitigated → Closed
  ↑         │               │
  └─────────┘               │
  └─────────────────────────┘
```

- **Transitions require a mandatory comment** explaining the reason.
- **Closing requires a root cause** in addition to a comment.
- All transitions are recorded in the timeline and audit log.

### Incident Detail Page

- **Status transition bar** — Visual pipeline showing current state with action buttons.
- **Assignment selector** — Assign the incident to a workspace member.
- **Description & Root Cause** — Shown side-by-side when root cause is provided.
- **Unified Timeline** — Chronological feed of comments, status changes, and linked events.
- **Comment box** — Add free-text comments at any time.

---

## Audit Log & Compliance

The Audit Log page (`/audit-log`) provides a complete record of all workspace actions.

### Filters

- **Action type** — Create, Read, Update, Delete, Transition, Ingest.
- **Resource type** — Agent, Incident, Policy, Event, Workspace, Member.
- **Date range** — From / To date pickers.

### Expandable Rows

Click the expand arrow on any row to see the full `details` JSON payload.

### Read-Audit Logging

Sensitive views automatically log `read` actions:
- Dashboard → logs workspace read
- Incident Detail → logs specific incident read
- Policy Detail → logs specific policy read
- Event Detail panel → logs specific event read

---

## Workspace Settings

The Settings page (`/settings`) allows workspace owners/admins to:

- **Rename the workspace**.
- **View members** — See all workspace members, their roles, and join dates.
- **Manage membership** — (Owner/Admin only) future feature for inviting and removing members.
