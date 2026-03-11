# AgentOps — Azure-Native Governance & Agentic DevOps Control Plane

> **"Your Entra-secured control plane for autonomous AI agents."**

Monitor, govern, and auto-remediate policy violations across your AI agent fleet. AgentOps is an enterprise-grade solution built natively on the **Microsoft Azure AI Platform** to provide real-time auditing, semantic policy enforcement, and autonomous incident response.

---

## 🔎 For Judges: AI Dev Days Hackathon

This project is a 100% Azure-native pivot of a governance console, specifically engineered for the **"Best Enterprise Solution"** and **"Agentic DevOps"** tracks.

| Judging Axis | How We Address It | Artifacts |
| :--- | :--- | :--- |
| **Technological Implementation** | Native Azure Stack: SWA, Functions, Azure SQL, Entra ID, Content Safety, OpenAI. | [Bicep Template](infra/main.bicep) |
| **Agentic Design & Innovation** | **OpsSentinel**: An autonomous SRE co-pilot that reasons over incidents and auto-mitigates them. | [Agentic DevOps Guide](docs/agentic-devops.md) |
| **Enterprise Readiness** | **Entra ID Auth** + **Azure SQL RLS** for tenant isolation & auditable governance. | [Security Model](docs/security-model.md) |
| **Responsible AI** | Real-time moderation via **AI Content Safety** & semantic compliance via **GPT-4o**. | [RAI Report](docs/rai-governance.md) |
| **Overall Impact** | 85% reduction in MTTR and 95% automated compliance coverage for AI fleets. | [Impact Statement](docs/impact-statement.md) |

👉 **[View the full JUDGING.md mapping](./JUDGING.md)**

---

## 🚀 Why AgentOps?

The rise of autonomous AI agents (chatbots, copilots, autonomous tools) has created a **governance vacuum**. Hallucinations, policy drift, and PII leaks in production agents carry massive compliance and reputational risks.

**AgentOps** bridges this gap by providing:
1.  **Agent Registry** — Unified fleet management for Microsoft Agent Framework and custom bots.
2.  **Semantic Policy Engine** — Define governance in plain English (e.g., *"Never mention competitor pricing"*) and enforce it via **Azure OpenAI (GPT-4o)**.
3.  **Real-time Moderation** — Automatic PII and safety screening via **Azure AI Content Safety**.
4.  **OpsSentinel (Agentic DevOps)** — An SRE co-pilot that observes telemetry, reasons over incidents, and proposes automated remediation (GitHub PRs, prompt patches).
5.  **Audit Trail** — Every action is secured by **Microsoft Entra ID** and recorded in an immutable audit log.

---

## 🎬 Demo Script: From Violation to Remediation

Follow this 3-step narrative to experience the full power of AgentOps Agentic DevOps.

### 1. Cause an Incident
Run the hallucination simulation tool to trigger a semantic policy violation. This simulates a production agent providing inaccurate information contradicted by its grounding context.
```bash
npx ts-node tools/test-hallucination.ts
```
*   **Console Observation:** A new **"Critical"** incident appears on the Dashboard within seconds.
*   **Audit Observation:** The `ingest-events` log shows the **CoVe (Chain-of-Verification)** loop detecting the factual contradiction.

### 2. OpsSentinel Reasons
Wait for the **OpsSentinel** background loop to trigger (or run the trigger tool).
```bash
npx ts-node tools/trigger-ops-sentinel.ts
```
*   **Console Observation:** Navigate to the Incident Detail page. You will see a **System Generated Comment** from OpsSentinel.
*   **The Reasoning:** *"OpsSentinel Investigation Result: The agent is hallucinating factual claims about geographic data. Root Cause: System prompt lacks strict groundedness constraints."*

### 3. Autonomous Action
Observe the automated remediation steps taken by the co-pilot.
*   **GitHub Action:** Check your configured GitHub repository. A **New Pull Request** has been opened with a suggested prompt engineering patch to fix the hallucination.
*   **Quarantine (Optional):** If the violation was flagged as a safety risk, the **Azure AI Foundry** deployment traffic is automatically set to 0%, preventing further user exposure.

---

## 🛠️ Architecture

AgentOps is built to mirror Microsoft's enterprise guidance for AI governance at scale:

- **Identity:** Microsoft Entra ID (MSAL integration).
- **Compute:** Azure Functions v4 (Node.js/TS) on Flex Consumption.
- **Data:** Azure SQL Database with **Row-Level Security (RLS)** for strict multi-tenant isolation.
- **AI Core:** Azure OpenAI (GPT-4o) & Azure AI Content Safety.
- **Observability:** Azure Monitor / Application Insights.

---

## 📖 Documentation

| Document | Description |
|---|---|
| [`docs/architecture.md`](docs/architecture.md) | System diagram, Azure flow, and OpsSentinel loop. |
| [`docs/security-model.md`](docs/security-model.md) | Entra ID RBAC and Azure SQL RLS implementation. |
| [`docs/agentic-devops.md`](docs/agentic-devops.md) | Deep dive into the OpsSentinel SRE co-pilot. |
| [`docs/rai-governance.md`](docs/rai-governance.md) | Responsible AI and Transparency Report. |
| [`docs/impact-statement.md`](docs/impact-statement.md) | Quantified enterprise ROI and risk mitigation. |
| [`docs/api-reference.md`](docs/api-reference.md) | `ingest-events` API with support for Agent Framework. |

---

## 🏗️ Getting Started (Developer Guide)

### Prerequisites
- Node.js ≥ 20
- Azure Subscription (for AI Services & SQL)
- Azure CLI & Bicep

### Infrastructure Provisioning
```bash
az deployment group create --resource-group <rg-name> --template-file infra/main.bicep
```

### Local Development
1. `npm install`
2. Configure `.env` with your Azure resource endpoints.
3. `npm run dev`

---

Built for **AI Dev Days Hackathon 2026** by the AgentOps Team.
