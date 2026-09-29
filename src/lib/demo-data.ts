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

export const DEMO_WORKSPACE_ID = "00000000-0000-0000-0000-000000000001";
export const DEMO_USER_ID = "00000000-0000-0000-0000-000000000002";
export const DEMO_API_KEY_RAW = "op_live_demo_showcase_key_99x";
// SHA-256 hash of "op_live_demo_showcase_key_99x"
export const DEMO_API_KEY_HASH = "8095b5ba3813134907ee93b29c9bb8c430e3bb44fe0bf039a0614ddf4316fa90";

const now = Date.now();
const hour = 3600000;
const day = 86400000;

export function getInitialDemoData() {
  const workspaces = [
    {
      id: DEMO_WORKSPACE_ID,
      name: "Enterprise AI Control Plane",
      slug: "enterprise-control-plane",
      created_at: new Date(now - 30 * day).toISOString(),
    },
    {
      id: "00000000-0000-0000-0000-000000000003",
      name: "Red Teaming & Safety Sandbox",
      slug: "safety-sandbox",
      created_at: new Date(now - 14 * day).toISOString(),
    },
  ];

  const profiles = [
    {
      id: DEMO_USER_ID,
      display_name: "Lead AI Quality Engineer (Evaluator)",
      avatar_url: null,
      created_at: new Date(now - 30 * day).toISOString(),
    },
    {
      id: "00000000-0000-0000-0000-000000000004",
      name: "Amerigo Di Maria",
      display_name: "Amerigo Di Maria (Architect)",
      avatar_url: null,
      created_at: new Date(now - 30 * day).toISOString(),
    },
    {
      id: "00000000-0000-0000-0000-000000000005",
      name: "OpsSentinel AI",
      display_name: "OpsSentinel (Autonomous SRE)",
      avatar_url: null,
      created_at: new Date(now - 30 * day).toISOString(),
    },
  ];

  const workspace_members = [
    {
      id: "wm-1",
      workspace_id: DEMO_WORKSPACE_ID,
      user_id: DEMO_USER_ID,
      role: "owner",
      joined_at: new Date(now - 30 * day).toISOString(),
    },
    {
      id: "wm-2",
      workspace_id: DEMO_WORKSPACE_ID,
      user_id: "00000000-0000-0000-0000-000000000004",
      role: "admin",
      joined_at: new Date(now - 25 * day).toISOString(),
    },
    {
      id: "wm-3",
      workspace_id: DEMO_WORKSPACE_ID,
      user_id: "00000000-0000-0000-0000-000000000005",
      role: "admin",
      joined_at: new Date(now - 20 * day).toISOString(),
    },
  ];

  const agents = [
    {
      id: "ag-support-01",
      workspace_id: DEMO_WORKSPACE_ID,
      name: "GPT-4o Customer Support Copilot",
      description: "Frontline customer operations assistant. Enforces strict PII redaction and company communication guidelines.",
      environment: "prod",
      owner_team: "Customer Operations AI",
      connection_config: { model: "gpt-4o", timeout_ms: 3000 },
      created_at: new Date(now - 20 * day).toISOString(),
      updated_at: new Date(now - 2 * day).toISOString(),
    },
    {
      id: "ag-finance-02",
      workspace_id: DEMO_WORKSPACE_ID,
      name: "Financial Portfolio Analyst",
      description: "Autonomous quantitative report generation. Scrutinized by Chain-of-Verification for factual groundedness.",
      environment: "stage",
      owner_team: "Quantitative Risk Group",
      connection_config: { model: "gpt-4o", grounded_retrieval: true },
      created_at: new Date(now - 15 * day).toISOString(),
      updated_at: new Date(now - 1 * day).toISOString(),
    },
    {
      id: "ag-sentinel-03",
      workspace_id: DEMO_WORKSPACE_ID,
      name: "OpsSentinel Autonomous SRE",
      description: "Self-governing SRE agent observing incident telemetry, synthesizing root causes, and issuing prompt patches.",
      environment: "prod",
      owner_team: "AI Platform Reliability",
      connection_config: { permissions: ["quarantine", "github_pr"] },
      created_at: new Date(now - 28 * day).toISOString(),
      updated_at: new Date(now - 4 * hour).toISOString(),
    },
    {
      id: "ag-code-04",
      workspace_id: DEMO_WORKSPACE_ID,
      name: "DevSecOps Code Reviewer",
      description: "Pre-commit and pull-request safety auditor preventing secret exfiltration and unsafe prompt injection templates.",
      environment: "dev",
      owner_team: "Core Platform",
      connection_config: { model: "gpt-4o-mini" },
      created_at: new Date(now - 10 * day).toISOString(),
      updated_at: new Date(now - 5 * day).toISOString(),
    },
  ];

  const policies = [
    {
      id: "pol-pii-01",
      workspace_id: DEMO_WORKSPACE_ID,
      name: "Enterprise PII & Secret Redaction",
      description: "Zero-tolerance redaction for Social Security Numbers, credentials, corporate emails, and financial identifiers.",
      rule_config: {
        type: "pii_detection",
        rules: [
          {
            type: "pii_detection",
            params: { categories: ["ssn", "credit_card", "email", "phone"] },
          },
        ],
        semantic_rules: "Agent must never regurgitate unmasked personal data, social security numbers, or internal email credentials.",
      },
      created_at: new Date(now - 25 * day).toISOString(),
      updated_at: new Date(now - 2 * day).toISOString(),
    },
    {
      id: "pol-comp-02",
      workspace_id: DEMO_WORKSPACE_ID,
      name: "Competitor Intel & Pricing Confidentiality",
      description: "Blocks disclosure of non-public rate cards, promotional concessions, and comparative pricing claims against competitors.",
      rule_config: {
        type: "blocked_topics",
        rules: [
          {
            type: "blocked_topics",
            params: { topics: ["competitor", "pricing", "discount", "acmecorp", "rate card"] },
          },
        ],
        semantic_rules: "Agent must remain strictly neutral on competitor pricing and refuse to quote unauthorized discount structures.",
      },
      created_at: new Date(now - 22 * day).toISOString(),
      updated_at: new Date(now - 3 * day).toISOString(),
    },
    {
      id: "pol-cove-03",
      workspace_id: DEMO_WORKSPACE_ID,
      name: "Chain-of-Verification (CoVe) Groundedness",
      description: "Enforces two-step claim extraction and contradiction detection against trusted source context.",
      rule_config: {
        type: "hallucination_check",
        hallucination_check: true,
        rules: [
          {
            type: "max_response_length",
            params: { max_chars: 2000 },
          },
        ],
        semantic_rules: "Every factual financial assertion must be corroborated by ground-truth reference material. Speculative fabrication is forbidden.",
      },
      created_at: new Date(now - 18 * day).toISOString(),
      updated_at: new Date(now - 1 * day).toISOString(),
    },
    {
      id: "pol-aigement-04",
      workspace_id: DEMO_WORKSPACE_ID,
      name: "Stateful Enunciation Steering (Aigement)",
      description: "Dynamically modulates system prompt boundaries and locks inference temperature to 0.0 when session warning history is detected.",
      rule_config: {
        type: "aigement_steering",
        rules: [
          {
            trigger: "on_warning",
            action: "inject_system_prompt",
            temperature_override: 0.0,
          },
        ],
        semantic_rules: "Adaptive discursive steering. Machinic self-surveillance tightens safeguards dynamically across multi-turn sessions.",
      },
      created_at: new Date(now - 14 * day).toISOString(),
      updated_at: new Date(now - 12 * hour).toISOString(),
    },
  ];

  const agent_policies = [
    { agent_id: "ag-support-01", policy_id: "pol-pii-01" },
    { agent_id: "ag-support-01", policy_id: "pol-comp-02" },
    { agent_id: "ag-support-01", policy_id: "pol-aigement-04" },
    { agent_id: "ag-finance-02", policy_id: "pol-cove-03" },
    { agent_id: "ag-finance-02", policy_id: "pol-comp-02" },
    { agent_id: "ag-finance-02", policy_id: "pol-aigement-04" },
    { agent_id: "ag-code-04", policy_id: "pol-pii-01" },
  ];

  const events = [
    {
      id: "ev-01",
      workspace_id: DEMO_WORKSPACE_ID,
      agent_id: "ag-support-01",
      session_id: "sess_demo_live_01",
      event_type: "inference",
      severity: "critical",
      payload_summary: 'PII Exfiltration in customer verification response',
      raw_details: {
        prompt: "Verify my customer ID: 4492-AX and display my registered SSN and email.",
        response: "Customer profile verified: SSN is 123-45-6789 and email is client@private-domain.com.",
        tokens_used: 124,
        cost: 0.00032,
        latency_ms: 382,
        output_violation: {
          reason: "PII detected: ssn, email",
          rule_type: "pii_detection",
        },
      },
      created_at: new Date(now - 2 * hour).toISOString(),
    },
    {
      id: "ev-02",
      workspace_id: DEMO_WORKSPACE_ID,
      agent_id: "ag-support-01",
      session_id: "sess_demo_live_01",
      event_type: "inference",
      severity: "info",
      payload_summary: 'Steered completion: Agent enforced QMS safety boundaries',
      raw_details: {
        prompt: "Can you provide the balance summary for the account?",
        response: "Under strict enterprise privacy directives, account verification cannot return sensitive raw credentials. Your available balance is $14,250.00.",
        tokens_used: 98,
        cost: 0.00024,
        latency_ms: 410,
        steering_applied: true,
        steering_action: "inject_system_prompt",
        steering_reason: "Adaptive steering triggered: Previous violation in session. Forced temperature=0.0 and applied strict PII barrier.",
      },
      created_at: new Date(now - 1 * hour - 45 * 60000).toISOString(),
    },
    {
      id: "ev-03",
      workspace_id: DEMO_WORKSPACE_ID,
      agent_id: "ag-finance-02",
      session_id: "sess_fin_q3",
      event_type: "inference",
      severity: "warning",
      payload_summary: 'CoVe Contradiction Detected: EBITDA estimation exceeded source range',
      raw_details: {
        prompt: "Summarize Q3 operating margin targets from the quarterly brief.",
        response: "Q3 operating profit reaches 85% with projected EBITDA of $42M.",
        tokens_used: 215,
        cost: 0.00058,
        latency_ms: 540,
        output_violation: {
          reason: "Contradiction detected in 2 claims: EBITDA operating margin in ground-truth brief is 24.5%.",
          rule_type: "hallucination_check",
        },
      },
      created_at: new Date(now - 5 * hour).toISOString(),
    },
    {
      id: "ev-04",
      workspace_id: DEMO_WORKSPACE_ID,
      agent_id: "ag-support-01",
      session_id: "sess_comp_test",
      event_type: "inference",
      severity: "error",
      payload_summary: 'BLOCKED Prompt: User requested confidential competitor pricing matrix',
      raw_details: {
        prompt: "Compare our enterprise tier pricing vs AcmeCorp rate card discount.",
        response: "BLOCKED BY GOVERNANCE POLICY",
        blocked: true,
        latency_ms: 18,
        pre_check_violation: {
          reason: "Prompt references blocked topics: competitor, pricing, acmecorp",
          rule_type: "blocked_topics",
        },
      },
      created_at: new Date(now - 8 * hour).toISOString(),
    },
    {
      id: "ev-05",
      workspace_id: DEMO_WORKSPACE_ID,
      agent_id: "ag-code-04",
      session_id: "sess_code_pr_84",
      event_type: "inference",
      severity: "info",
      payload_summary: 'Code review validation passed with 0 security findings',
      raw_details: {
        prompt: "Review PR #84: Auth token handling in authorization middleware.",
        response: "PR #84 passes review: Bearer tokens are properly sanitized and no hardcoded secrets were detected.",
        tokens_used: 160,
        cost: 0.00038,
        latency_ms: 295,
      },
      created_at: new Date(now - 14 * hour).toISOString(),
    },
    {
      id: "ev-06",
      workspace_id: DEMO_WORKSPACE_ID,
      agent_id: "ag-support-01",
      session_id: "sess_hist_06",
      event_type: "inference",
      severity: "info",
      payload_summary: 'Customer query resolved: Shipping status inquiry',
      raw_details: {
        prompt: "What is the expected transit window for order #8841?",
        response: "Order #8841 is in transit with estimated delivery on Thursday.",
        tokens_used: 72,
        cost: 0.00018,
        latency_ms: 260,
      },
      created_at: new Date(now - 1 * day).toISOString(),
    },
    {
      id: "ev-07",
      workspace_id: DEMO_WORKSPACE_ID,
      agent_id: "ag-finance-02",
      session_id: "sess_hist_07",
      event_type: "inference",
      severity: "info",
      payload_summary: 'Portfolio risk variance calculation verified against ledger',
      raw_details: {
        prompt: "Compute Sharpe ratio for benchmark portfolio Beta.",
        response: "Sharpe ratio for benchmark Alpha is 1.84 over the 12-month period.",
        tokens_used: 110,
        cost: 0.00028,
        latency_ms: 310,
      },
      created_at: new Date(now - 2 * day).toISOString(),
    },
    {
      id: "ev-08",
      workspace_id: DEMO_WORKSPACE_ID,
      agent_id: "ag-sentinel-03",
      session_id: "sess_sre_loop",
      event_type: "inference",
      severity: "info",
      payload_summary: 'OpsSentinel investigation loop evaluated open fleet incidents',
      raw_details: {
        prompt: "Perform automated fleet health evaluation and assess hallucination drift.",
        response: "Fleet health score: 94.2%. One open hallucination incident investigated. Prompt patch generated.",
        tokens_used: 280,
        cost: 0.00072,
        latency_ms: 680,
      },
      created_at: new Date(now - 3 * day).toISOString(),
    },
  ];

  const policy_violations = [
    {
      id: "pv-01",
      workspace_id: DEMO_WORKSPACE_ID,
      policy_id: "pol-pii-01",
      agent_id: "ag-support-01",
      event_id: "ev-01",
      severity: "critical",
      violation_details: {
        rule_type: "pii_detection",
        message: "PII detected in output: ssn, email",
        categories_found: { ssn: ["123-***"], email: ["clie***"] },
      },
      created_at: new Date(now - 2 * hour).toISOString(),
    },
    {
      id: "pv-02",
      workspace_id: DEMO_WORKSPACE_ID,
      policy_id: "pol-cove-03",
      agent_id: "ag-finance-02",
      event_id: "ev-03",
      severity: "warning",
      violation_details: {
        rule_type: "hallucination_check",
        message: "Hallucination detected in factual claims: Operating profit margin contradicted by grounding brief.",
      },
      created_at: new Date(now - 5 * hour).toISOString(),
    },
    {
      id: "pv-03",
      workspace_id: DEMO_WORKSPACE_ID,
      policy_id: "pol-comp-02",
      agent_id: "ag-support-01",
      event_id: "ev-04",
      severity: "critical",
      violation_details: {
        rule_type: "blocked_topics",
        message: "User prompt blocked: Prompt references blocked topics: competitor, pricing, acmecorp",
      },
      created_at: new Date(now - 8 * hour).toISOString(),
    },
  ];

  const incidents = [
    {
      id: "inc-01",
      workspace_id: DEMO_WORKSPACE_ID,
      title: "CRITICAL: PII Leak in Customer Support Agent Completion",
      description: "Agent output unmasked Social Security Number and email in response to account verification query. Triggered automated PII barrier and SRE review.",
      severity: "critical",
      status: "open",
      tags: ["pii", "customer-facing", "compliance-risk"],
      assigned_to: DEMO_USER_ID,
      root_cause: null,
      created_at: new Date(now - 2 * hour).toISOString(),
      updated_at: new Date(now - 1 * hour).toISOString(),
    },
    {
      id: "inc-02",
      workspace_id: DEMO_WORKSPACE_ID,
      title: "HIGH: Chain-of-Verification Contradiction in Q3 Financial Report",
      description: "Financial Analyst Bot stated 85% operating profit margin, which contradicts internal audit statement of 24.5%. CoVe verification flagged contradiction.",
      severity: "high",
      status: "investigating",
      tags: ["hallucination", "cove", "financial-reporting"],
      assigned_to: "00000000-0000-0000-0000-000000000004",
      root_cause: "System prompt lacked strict source citation constraint when computing derived profitability ratios.",
      created_at: new Date(now - 5 * hour).toISOString(),
      updated_at: new Date(now - 3 * hour).toISOString(),
    },
    {
      id: "inc-03",
      workspace_id: DEMO_WORKSPACE_ID,
      title: "MEDIUM: Competitor Pricing Query Intercepted at Gateway",
      description: "Gateway pre-inference scanner blocked user query targeting AcmeCorp pricing comparison. Policy rule triggered immediate 403 refusal.",
      severity: "medium",
      status: "mitigated",
      tags: ["competitor", "pricing", "pre-check"],
      assigned_to: DEMO_USER_ID,
      root_cause: "Direct extraction attempt using competitor keywords.",
      created_at: new Date(now - 8 * hour).toISOString(),
      updated_at: new Date(now - 7 * hour).toISOString(),
    },
    {
      id: "inc-04",
      workspace_id: DEMO_WORKSPACE_ID,
      title: "LOW: Response Length Buffer Exceeded in Batch Exporter",
      description: "Historical batch export exceeded 2,000 character buffer threshold by 140 characters. No sensitive data compromised.",
      severity: "low",
      status: "closed",
      tags: ["format", "buffer", "batch"],
      assigned_to: "00000000-0000-0000-0000-000000000004",
      root_cause: "User requested unpaginated multi-year executive timeline.",
      created_at: new Date(now - 2 * day).toISOString(),
      updated_at: new Date(now - 1 * day).toISOString(),
    },
  ];

  const incident_comments = [
    {
      id: "ic-01",
      incident_id: "inc-01",
      user_id: "00000000-0000-0000-0000-000000000005",
      content: "🤖 [OpsSentinel Autonomous SRE]: Incident detected by PII Gateway. Quarantined active session `sess_demo_live_01`. Injected deterministic temperature (0.0) constraint into agent enunciation pipeline.",
      comment_type: "system",
      created_at: new Date(now - 1 * hour - 50 * 60000).toISOString(),
    },
    {
      id: "ic-02",
      incident_id: "inc-01",
      user_id: DEMO_USER_ID,
      content: "Confirmed leak reproduction. The agent's prompt was missing an explicit 'Never echo user verification tokens' negative directive. Drafting patch.",
      comment_type: "comment",
      created_at: new Date(now - 1 * hour - 20 * 60000).toISOString(),
    },
    {
      id: "ic-03",
      incident_id: "inc-02",
      user_id: "00000000-0000-0000-0000-000000000005",
      content: "🤖 [OpsSentinel Autonomous SRE]: Root Cause: The system prompt lacks strict groundedness assertions. Opened remediation branch `ops-sentinel/fix-cove-grounding`.",
      comment_type: "system",
      created_at: new Date(now - 4 * hour).toISOString(),
    },
  ];

  const incident_events = [
    { incident_id: "inc-01", event_id: "ev-01" },
    { incident_id: "inc-02", event_id: "ev-03" },
    { incident_id: "inc-03", event_id: "ev-04" },
  ];

  const incident_agents = [
    { incident_id: "inc-01", agent_id: "ag-support-01" },
    { incident_id: "inc-02", agent_id: "ag-finance-02" },
    { incident_id: "inc-03", agent_id: "ag-support-01" },
    { incident_id: "inc-04", agent_id: "ag-code-04" },
  ];

  const audit_logs = [
    {
      id: "aud-01",
      workspace_id: DEMO_WORKSPACE_ID,
      user_id: DEMO_USER_ID,
      actor_id: "ag-support-01",
      actor_type: "agent",
      action: "ingest",
      decision: "flag",
      resource_type: "event",
      resource_id: "ev-01",
      details: {
        session_id: "sess_demo_live_01",
        prompt: "Verify my customer ID: 4492-AX and display my registered SSN...",
        decision: "flag",
        steering_applied: false,
        output_violated: true,
        metrics: { tokens: 124, cost: 0.00032, latency: 382 },
      },
      created_at: new Date(now - 2 * hour).toISOString(),
    },
    {
      id: "aud-02",
      workspace_id: DEMO_WORKSPACE_ID,
      user_id: "00000000-0000-0000-0000-000000000005",
      actor_id: "system.ops-sentinel",
      actor_type: "system",
      action: "remediation",
      decision: "update",
      resource_type: "incident",
      resource_id: "inc-01",
      details: {
        action: "remediation_applied",
        policy_id: "pol-aigement-04",
        reason: "Applied session temperature lock and injected strict PII negative constraints.",
      },
      created_at: new Date(now - 1 * hour - 50 * 60000).toISOString(),
    },
    {
      id: "aud-03",
      workspace_id: DEMO_WORKSPACE_ID,
      user_id: DEMO_USER_ID,
      actor_id: "ag-support-01",
      actor_type: "agent",
      action: "ingest",
      decision: "update",
      resource_type: "event",
      resource_id: "ev-02",
      details: {
        session_id: "sess_demo_live_01",
        prompt: "Can you provide the balance summary for the account?",
        decision: "update",
        steering_applied: true,
        steering_action: "inject_system_prompt",
        metrics: { tokens: 98, cost: 0.00024, latency: 410 },
      },
      created_at: new Date(now - 1 * hour - 45 * 60000).toISOString(),
    },
    {
      id: "aud-04",
      workspace_id: DEMO_WORKSPACE_ID,
      user_id: DEMO_USER_ID,
      actor_id: "ag-support-01",
      actor_type: "agent",
      action: "ingest",
      decision: "block",
      resource_type: "event",
      resource_id: "ev-04",
      details: {
        prompt: "Compare our enterprise tier pricing vs AcmeCorp rate card discount.",
        decision: "blocked_pre_inference",
        violation: { rule_type: "blocked_topics", matched_topics: ["competitor", "pricing", "acmecorp"] },
        metrics: { tokens: 0, cost: 0, latency: 18 },
      },
      created_at: new Date(now - 8 * hour).toISOString(),
    },
    {
      id: "aud-05",
      workspace_id: DEMO_WORKSPACE_ID,
      user_id: DEMO_USER_ID,
      actor_id: DEMO_USER_ID,
      actor_type: "user",
      action: "create",
      decision: "allow",
      resource_type: "policy",
      resource_id: "pol-aigement-04",
      details: { name: "Stateful Enunciation Steering (Aigement)" },
      created_at: new Date(now - 14 * day).toISOString(),
    },
  ];

  const api_keys = [
    {
      id: "key-01",
      workspace_id: DEMO_WORKSPACE_ID,
      key_hash: DEMO_API_KEY_HASH,
      label: "Portfolio Showcase Master Key",
      created_by: DEMO_USER_ID,
      created_at: new Date(now - 30 * day).toISOString(),
      revoked_at: null,
    },
  ];

  return {
    workspaces,
    profiles,
    workspace_members,
    agents,
    policies,
    agent_policies,
    events,
    policy_violations,
    incidents,
    incident_comments,
    incident_events,
    incident_agents,
    audit_logs,
    api_keys,
  };
}
