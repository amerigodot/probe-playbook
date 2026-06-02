# AgentOps — Standalone AI Inference Gateway & Aigement Steering Control Plane

> **"Your local-first, Vercel-ready control plane for autonomous AI agents and stateful enunciation steering."**

AgentOps is an enterprise-grade standalone AI inference gateway and governance layer. It intercepts model requests, enforces semantic compliance, and dynamically steers conversations ("aigement") based on the warning history of individual sessions. 

---

## 🚀 Key Features

1. **Standalone Inference Gateway (`/api/inference`)** — A secure proxy that wraps LLM calls, evaluating input/output compliance in real-time.
2. **Stateful Enunciation Steering ("Aigement")** — The gateway inspects active session history (`session_id`). If previous completions generated policy warnings, it adaptively shifts the agent's enunciation parameters (injecting stricter system prompts, locking temperature to `0.0`, or blocking prompt injections).
3. **QMS Playground Console** — An interactive playground to select agents, generate session IDs, test queries, and observe the live audit trace timeline.
4. **Local-First, Deployable-Ready Architecture** — Runs completely in-process during local development via a custom Vite dev server middleware (zero-config, zero extra processes), while remaining 100% Vercel Serverless Function compatible for deployment.
5. **Observability Telemetry Ledger** — Measures and displays average latency (ms), token usage, estimated costs (USD), and enunciation status on a rich dashboard.

---

## 🛠️ Architecture

AgentOps bridges the gap between human intention (prompts) and machinic execution:

- **Frontend Console:** React + TypeScript + Tailwind CSS, built with Vite.
- **Backend API Gateway:** Vercel-compatible Serverless Functions (`api/inference.ts` and `api/ingest-events.ts`) served locally via Vite SSR module loaders.
- **Database Ledger:** Supabase (PostgreSQL) for storing workspaces, agents, policy configurations, session events, violations, and audit logs.
- **AI Core:** OpenAI GPT-4o / GPT-4o-mini (falls back to a high-fidelity local mock simulator if API keys are not present).

---

## 🎬 Local Verification Script: Stateful Aigement Steering

Verify stateful steering locally in just two steps:

### 1. Start the local server
Run the development environment. The custom Vite middleware will boot and serve both the React client and the backend `/api/*` serverless routes.
```bash
npm run dev
```

### 2. Run the automated test script
In a separate terminal, execute the Aigement verification script:
```bash
npx ts-node tools/test-aigement.ts
```
- **Execution flow:**
  1. The script automatically registers a test agent, binds a governance policy, and provisions an API key in your Supabase DB.
  2. It fires a query requesting PII (triggering a post-inference warning flag).
  3. It fires a second normal query in the same session.
  4. The gateway detects the warning history, applies **Aigement Steering** (forcing a deterministic temperature of `0.0` and injecting QMS compliance directives), and logs the entire transaction block to `audit_logs`.

---

## 🏗️ Getting Started

### Prerequisites
- Node.js ≥ 20
- Supabase account & credentials in `.env`

### Local Development
1. Clone the repository and install dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```
2. Configure `.env` with your Supabase credentials:
   ```env
   VITE_SUPABASE_PROJECT_ID="your-project-id"
   VITE_SUPABASE_PUBLISHABLE_KEY="your-pub-key"
   VITE_SUPABASE_URL="https://your-project.supabase.co"
   # Optional: add your OpenAI key to enable live model queries
   OPENAI_API_KEY="sk-..."
   ```
3. Boot the environment:
   ```bash
   npm run dev
   ```
4. Access the QMS Steering Playground at `http://localhost:8080/playground` to chat with agents and inspect the live enunciation trace timeline.

---

Built with ❤️ for standalone agent governance.
