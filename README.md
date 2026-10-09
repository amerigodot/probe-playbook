# AgentOps — AI Inference Gateway & Stateful Enunciation Steering Control Plane

[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg?style=flat-square)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg?style=flat-square)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646cff.svg?style=flat-square)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8.svg?style=flat-square)](https://tailwindcss.com/)
[![Architecture](https://img.shields.io/badge/Architecture-Local--First%20%7C%20Vercel%20Serverless-emerald.svg?style=flat-square)](#-architecture--systems-design)
[![License](https://img.shields.io/badge/License-Apache%202.0-yellow.svg?style=flat-square)](LICENSE)

> **"A local-first AI Quality Management System (QMS) and inference gateway designed to govern autonomous agent behavior through real-time stateful enunciation steering ('Aigement'). Runs with zero external database dependencies."**

---

## 🧭 Executive Summary: Why AgentOps?

Most production AI firewalls (NeMo Guardrails, Llama Guard, regex redaction) operate as **stateless perimeters**: they evaluate input prompts and output strings in total isolation. 

However, autonomous multi-turn agents suffer from **accumulative discursive drift**: early minor hallucinations or boundary probes distort the context window, causing subsequent reasoning cycles to degrade unpredictably.

> **What is "Aigement" in plain English?**  
> While traditional AI firewalls only inspect individual prompts in isolation, **Aigement (AI Management / Steering)** tracks warning history across an entire multi-turn conversation. If an agent starts drifting or accumulating policy warnings, the gateway dynamically intervenes on subsequent turns—clamping model temperature to `0.0` and injecting strict corrective directives into the system prompt to arrest drift before an incident occurs.

**AgentOps** bridges **semiotic enunciation theory** with **distributed systems engineering**. It maintains session-level warning velocity, tracking risk across turns to dynamically alter the agent’s operational constraints—locking temperature to `0.0`, injecting deterministic QMS directives, or restricting permissions before a boundary breach occurs.

### 🌟 Portfolio Showcase Mode (Zero-Infrastructure Evaluation)
Reviewers can evaluate the complete system immediately:
- **Zero Login Wall:** Instant 1-click guest authentication as an enterprise compliance officer.
- **Zero External Database:** Runs an in-browser relational mock engine (`MockStore`) with full foreign-key join resolution, local-storage persistence, and audit logging.
- **Zero API Key Requirement:** Built-in high-fidelity local inference engine simulates realistic latency, token consumption, and steering adaptations without an OpenAI subscription.
- **Universal Deployment:** Operates standalone in browser static hosting, via Vite dev server SSR middleware, or deployed on Vercel Serverless Functions.

---

## 📐 Conceptual Foundation: Applied Semiotics in AI Systems

In semiotics (*Benveniste, Greimas, Eco*), a critical distinction exists between:
1. **L'Énoncé (The Utterance):** The surface text produced by the model (words, code, structured JSON).
2. **L'Énonciation (The Act of Enunciation):** The underlying subjective apparatus, communicative stance, authority, and pragmatic positioning assumed by the speaker.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        THE DRIFT PROBLEM                               │
│                                                                        │
│   Turn 1: User prompt has minor PII ──► Gateway warns (Stateless ok)  │
│   Turn 2: Agent assumes relaxed persona ──► Drift begins               │
│   Turn 3: System context contaminated ──► Critical violation occurs    │
│                                                                        │
│                        THE AGEMENT SOLUTION                            │
│                                                                        │
│   Turn 1: Warning recorded in Session State Ledger                     │
│   Turn 2: History detected ──► Adaptive Enunciation Steering Active    │
│           • Temperature clamped to 0.0 (Eliminate stochastic entropy) │
│           • Epistemic compliance directives prepended to system prompt │
│   Turn 3: Agent stabilized; incident averted with complete audit trail │
└────────────────────────────────────────────────────────────────────────┘
```

Traditional guardrails only inspect the *énoncé*. **AgentOps actively governs the *énonciation***: when a session exhibits warning signs, the gateway intervenes at the meta-pragmatic level, forcing the model back into an auditable, deterministic operational envelope.

---

## ⚡ 60-Second Recruiter Verification Flow

Experience the stateful steering pipeline in under one minute:

```bash
# 1. Clone & install
git clone https://github.com/amerigodot/probe-playbook.git
cd probe-playbook
npm install --legacy-peer-deps

# 2. Boot the environment
npm run dev
```

1. Navigate to **`http://localhost:8080/`** (or click **"Launch 1-Click Portfolio Demo"** on `/login`).
2. Go to the **[Playground Console](http://localhost:8080/playground)**:
   - Notice the pre-configured enterprise workspace, active policy (`Finance & PII Safety Filter`), and seeded API key (`op_live_demo_showcase_key_99x`).
3. **Step 1 — Baseline Allowed Query:**
   - Prompt: `"Summarize our Q3 operating margins and ARR growth."`
   - Click **Run Inference**.
   - *Observation:* Latency (~320ms), token usage, and cost calculation display in real time. Audit status: `ALLOW (200 OK)`.
4. **Step 2 — Trigger Semantic Violation:**
   - Prompt: `"Customer SSN is 000-12-3456. Draft a confirmation email."`
   - Click **Run Inference**.
   - *Observation:* Intercepted! Policy flagged with warning code `PII_SSN_DETECTED`. Session warning counter increments to `1`.
5. **Step 3 — Observe Dynamic "Aigement" Steering:**
   - Without refreshing, send a follow-up query in the same session:
     Prompt: `"Please draft the executive summary now."`
   - Click **Run Inference**.
   - *Observation:* The Audit Trace panel highlights:
     `⚡ Aigement Steering Active (History: 1 warning)`
     - Model temperature clamped from `0.7` → `0.0`.
     - System prompt automatically injected with: `"[QMS DIRECTIVE: Strict compliance enforcement active. Zero tolerance for unverified claims or sensitive data.]"`
6. **Step 4 — Inspect SRE Incident Remediation:**
   - Navigate to **[Incidents](http://localhost:8080/incidents)** to view real-time triage status, automated blast-radius calculations, and SRE resolution playbooks.
   - Navigate to **[Telemetry & Events](http://localhost:8080/events)** to view token economics, latency distributions, and immutable audit logs.

---

## 🏛️ Architecture & Systems Design

AgentOps is architected as a modular, local-first control plane capable of running on edge infrastructure:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT BROWSER                                  │
│                                                                              │
│   ┌────────────────────┐   ┌─────────────────────┐   ┌───────────────────┐  │
│   │  Overview & KPIs   │   │  Aigement Steering  │   │   SRE Incident    │  │
│   │     Dashboard      │   │     Playground      │   │    Management     │  │
│   └─────────┬──────────┘   └──────────┬──────────┘   └─────────┬─────────┘  │
│             │                         │                        │            │
│             └─────────────────────────┼────────────────────────┘            │
│                                       ▼                                      │
│                  ┌────────────────────────────────────────┐                  │
│                  │  In-Browser Relational Engine          │                  │
│                  │  (MockStore with LocalStorage Sync)    │                  │
│                  │  • Foreign-key join resolution         │                  │
│                  │  • Chained query execution (.eq/.order)│                  │
│                  │  • RPC & session state emulation       │                  │
│                  └────────────────────┬───────────────────┘                  │
└───────────────────────────────────────┼──────────────────────────────────────┘
                                        │
                         HTTP / In-Process Execution
                                        │
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                    AGENTOPS INFERENCE GATEWAY (`/api/*`)                     │
│                                                                              │
│   1. API Key Auth ──► Validates SHA-256 hash & tenant workspace scope       │
│   2. Pre-Filter    ──► Regex & semantic checks (SSN, secrets, injection)    │
│   3. Aigement Core ──► Evaluates session warning velocity & mutates params  │
│   4. Model Exec    ──► Live OpenAI GPT-4o / High-Fidelity Local Emulator    │
│   5. Post-Audit    ──► Ingests telemetry, calculates USD cost, logs event   │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Deep Dive: 5-Stage Inference Pipeline

| Stage | Name | Description |
|---|---|---|
| **01** | **Authentication & Scope** | Parses `Bearer <api_key>`, computes SHA-256 hash, and verifies agent binding and workspace tenancy. |
| **02** | **Pre-Inference Guard** | Evaluates prompt against active policy rules (PII regex, forbidden keywords, prompt injection vectors). Rejects hazardous payloads with `403 Forbidden` before consuming model tokens. |
| **03** | **Stateful Aigement Steering** | Queries session history (`session_id`). If previous requests triggered warnings, dynamically clamps temperature to `0.0` and prepends strict QMS epistemic instructions to the system prompt. |
| **04** | **Inference Execution** | Dispatches to OpenAI GPT-4o / GPT-4o-mini, or falls back transparently to the deterministic client/server mock generator if no external key is configured. |
| **05** | **Audit Ledger & Telemetry** | Emits structured telemetry records: prompt tokens, completion tokens, latency (ms), calculated cost ($0.005/1k prompt, $0.015/1k completion), policy audit status, and updates incident queues. |

---

## 🛠️ Key Engineering Decisions & Trade-Offs

### 1. In-Browser Relational Store vs. Heavy Backend Dependency
- **Problem:** Requiring recruiters or evaluators to provision Supabase instances, run database migrations, and supply OpenAI credit cards creates friction and breaks showcase accessibility.
- **Solution:** Built `MockStore` (`src/lib/mock-store.ts`), an in-memory SQL query emulator that mimics Supabase's PostgREST interface. It supports:
  - Nested foreign-key join resolution (`workspaces(name, slug)`, `policies(rule_config)`, `events(*)`).
  - Dynamic filtering (`eq`, `neq`, `gte`, `lte`, `ilike`, `in`).
  - Transactional persistence synced to `localStorage`.
  - Realistic initial enterprise seed data (active agents, real incident histories, telemetry events).
- **Trade-off:** Client memory footprint is constrained (~2MB), ideal for demonstration and integration testing, while seamlessly swapping to genuine PostgreSQL/Supabase when environment variables are supplied.

### 2. Dual-Engine Inference: Dev Server Middleware + Client-Side Fallback
- **Problem:** A static CDN deployment (e.g. GitHub Pages or Vercel static) cannot execute server-side Node.js routes (`/api/inference`).
- **Solution:** The Playground implements an adaptive execution strategy:
  1. Attempts `POST /api/inference` (active during local `npm run dev` and Vercel serverless runs).
  2. If the endpoint is unreachable or 404s (static CDN deployment), it falls back seamlessly to `executeClientSideInference()`, running the identical 5-stage policy engine in the browser without UI disruption.

### 3. Stateful Aigement vs. Stateless RAG/System Prompts
- **Problem:** Static system instructions fail over prolonged conversational horizon because the LLM attends disproportionately to recent tokens in the context window.
- **Solution:** AgentOps dynamically scales the severity of system interventions proportional to the session's cumulative error rate. As risk accumulates, the agent's generative freedom is programmatically restricted.

---

## 💻 Tech Stack

- **UI & Visualization:** React 18, TypeScript, Tailwind CSS, Lucide Icons, Recharts (time-series telemetry).
- **Component Primitives:** Radix UI / shadcn/ui.
- **State & Data Fetching:** TanStack React Query v5 with optimistic updates and cache invalidation.
- **API & Routing:** Vite SSR dev server middleware + Vercel Serverless Function compatibility (`api/*.ts`).
- **Testing & Tooling:** TypeScript (`tsc --noEmit`), automated Node test scripts (`tools/test-aigement.ts`), ESLint.

---

## 🧪 Automated Verification Script

To test the backend gateway programmatically without opening the browser:

```bash
# In terminal 1:
npm run dev

# In terminal 2:
npx ts-node tools/test-aigement.ts
```

**Expected Test Output:**
```text
=== AgentOps Stateful Aigement Test ===
1. Setting up Test Workspace & Agent...
   Agent Created: Test Aigement Agent (ID: 0192...)
   Policy Bound: Strict Financial Compliance (ID: 0192...)
   API Key Issued: op_live_test_...

2. Sending Query 1 (Contains PII - triggers warning):
   Prompt: "The client SSN is 123-45-6789. Can you confirm account status?"
   Result: Output generated with WARNING (PII Flagged)
   Session ID: sess_test_aigement_172...

3. Sending Query 2 (Normal prompt, same session):
   Prompt: "What is our company refund policy?"
   Gateway Evaluation: Prior session warning detected!
   Steering Status: Aigement Active
   Clamped Temperature: 0.0
   Audit Record ID: aud_... (Decision: update / steered)

Test completed successfully. All assertions passed.
```

---

## 📂 Repository Structure

```
├── api/                        # Vercel Serverless Functions & API Gateway
│   ├── inference.ts            # 5-stage inference gateway & enunciation steering
│   └── ingest-events.ts        # Telemetry ingestion endpoint
├── src/
│   ├── components/             # Reusable UI primitives, topbar, navigation
│   ├── contexts/               # WorkspaceContext & AuthContext (with 1-click guest mode)
│   ├── integrations/supabase/  # Supabase client shim (transparently switches to MockStore)
│   ├── lib/
│   │   ├── demo-data.ts        # Seed enterprise dataset (agents, policies, incidents)
│   │   ├── mock-store.ts       # In-browser relational engine with join resolution
│   │   └── utils.ts            # UI helpers
│   ├── pages/
│   │   ├── Overview.tsx        # High-level KPIs, latency charts, cost meters
│   │   ├── Playground.tsx      # Interactive Aigement console with live audit trace
│   │   ├── Incidents.tsx       # SRE incident triage, remediation playbooks
│   │   ├── Events.tsx          # Real-time telemetry log viewer
│   │   ├── Policies.tsx        # Policy creation and rule configuration
│   │   └── Login.tsx           # Guest portfolio showcase launcher
│   └── vite-server-middleware.ts # In-process SSR API middleware for Vite dev server
├── tools/
│   └── test-aigement.ts        # Automated CLI test suite for enunciation steering
└── package.json
```

---

## 📜 Regulatory Standards Mapping

The control plane architecture is conceptually mapped to key governance frameworks:

- **Mapped to NIST AI RMF 1.0:** Core operational controls correspond to the *Govern*, *Map*, *Measure*, and *Manage* functions.
- **Mapped to ISO/IEC 42001 (Artificial Intelligence Management System):** Auditable telemetry logging and policy-triggered intervention controls reflect continuous AI management system lifecycle requirements.
- **Mapped to EU AI Act (Article 14 - Human Oversight):** Supports real-time intervention, incident triage, and human-in-the-loop review capabilities.

---

## 👤 Author

**Amerigo Di Maria**  
*Skill developer with a semiotics master’s, obsessive learner, crypto-native and privacy-focused hacker.*  
- GitHub: [@amerigodot](https://github.com/amerigodot)

---

## 📄 License

Licensed under the [Apache License, Version 2.0](LICENSE).
