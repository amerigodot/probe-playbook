import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

// ---------- PII regex patterns ----------
const PII_PATTERNS: Record<string, RegExp> = {
  email: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  phone: /\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b/g,
  credit_card: /\b(?:\d[ -]*?){13,19}\b/g,
};

interface PolicyRule {
  type: string;
  params: Record<string, unknown>;
}

interface Violation {
  rule_type: string;
  message: string;
  details: Record<string, unknown>;
}

function checkMaxResponseLength(
  payload: Record<string, unknown>,
  params: Record<string, unknown>
): Violation | null {
  const maxChars = (params.max_chars as number) || 2000;
  const response = String(payload.response ?? payload.output ?? payload.payload_summary ?? "");
  if (response.length > maxChars) {
    return {
      rule_type: "max_response_length",
      message: `Response length ${response.length} exceeds limit ${maxChars}`,
      details: { length: response.length, limit: maxChars },
    };
  }
  return null;
}

function checkPiiDetection(
  payload: Record<string, unknown>,
  params: Record<string, unknown>
): Violation | null {
  const categories = (params.categories as string[]) || Object.keys(PII_PATTERNS);
  const text = JSON.stringify(payload);
  const found: Record<string, string[]> = {};

  for (const cat of categories) {
    const pattern = PII_PATTERNS[cat];
    if (!pattern) continue;
    const matches = text.match(new RegExp(pattern.source, pattern.flags));
    if (matches && matches.length > 0) {
      found[cat] = matches.map((m) => m.slice(0, 4) + "***");
    }
  }

  if (Object.keys(found).length > 0) {
    return {
      rule_type: "pii_detection",
      message: `PII detected: ${Object.keys(found).join(", ")}`,
      details: { categories_found: found },
    };
  }
  return null;
}

function checkBlockedTopics(
  payload: Record<string, unknown>,
  params: Record<string, unknown>
): Violation | null {
  const topics = (params.topics as string[]) || [];
  const text = JSON.stringify(payload).toLowerCase();
  const matched = topics.filter((t) => text.includes(t.toLowerCase()));

  if (matched.length > 0) {
    return {
      rule_type: "blocked_topics",
      message: `Blocked topics found: ${matched.join(", ")}`,
      details: { matched_topics: matched },
    };
  }
  return null;
}

const RULE_CHECKERS: Record<
  string,
  (payload: Record<string, unknown>, params: Record<string, unknown>) => Violation | null
> = {
  max_response_length: checkMaxResponseLength,
  pii_detection: checkPiiDetection,
  blocked_topics: checkBlockedTopics,
};

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return res.status(401).json({ error: "Missing x-api-key header" });
  }

  try {
    // Hash key
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    // Validate key
    const { data: keyRecord, error: keyError } = await supabase
      .from('api_keys')
      .select('workspace_id')
      .eq('key_hash', keyHash)
      .filter('revoked_at', 'is', null)
      .maybeSingle();

    if (keyError || !keyRecord) {
      return res.status(403).json({ error: "Invalid or revoked API key" });
    }

    const workspaceId = keyRecord.workspace_id;
    const {
      agent_id,
      event_type,
      severity = "info",
      session_id = null,
      payload_summary = null,
      raw_details = {},
    } = req.body;

    if (!agent_id || !event_type) {
      return res.status(400).json({ error: "agent_id and event_type are required" });
    }

    // Verify agent
    const { data: agent, error: agentErr } = await supabase
      .from("agents")
      .select("id, workspace_id")
      .eq("id", agent_id)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (agentErr || !agent) {
      return res.status(404).json({ error: "Agent not found in this workspace" });
    }

    // Insert event
    const { data: event, error: eventErr } = await supabase
      .from("events")
      .insert({
        workspace_id: workspaceId,
        agent_id,
        event_type,
        severity,
        session_id,
        payload_summary,
        raw_details,
      })
      .select("id")
      .single();

    if (eventErr || !event) {
      return res.status(500).json({ error: "Failed to insert event", detail: eventErr?.message });
    }

    // Check policies
    const { data: agentPolicies } = await supabase
      .from("agent_policies")
      .select("policy_id, policies(id, rule_config, name)")
      .eq("agent_id", agent_id);

    const violations: Array<{
      policy_id: string;
      policy_name: string;
      violation: Violation;
    }> = [];

    if (agentPolicies && agentPolicies.length > 0) {
      const eventPayload = { ...raw_details, payload_summary, event_type } as Record<string, unknown>;

      for (const ap of agentPolicies) {
        const policy = (ap as any).policies;
        if (!policy?.rule_config) continue;

        const ruleConfig = policy.rule_config as { rules?: PolicyRule[] };
        const rules = ruleConfig.rules ?? [];

        for (const rule of rules) {
          const checker = RULE_CHECKERS[rule.type];
          if (!checker) continue;

          const violation = checker(eventPayload, rule.params ?? {});
          if (violation) {
            violations.push({
              policy_id: policy.id,
              policy_name: policy.name,
              violation,
            });
          }
        }
      }
    }

    // Insert violations
    if (violations.length > 0) {
      const violationRows = violations.map((v) => ({
        workspace_id: workspaceId,
        policy_id: v.policy_id,
        agent_id,
        event_id: event.id,
        violation_details: {
          rule_type: v.violation.rule_type,
          message: v.violation.message,
          ...v.violation.details,
        },
        severity: severity === "info" ? "warning" : severity,
      }));

      await supabase.from("policy_violations").insert(violationRows);
    }

    // Insert audit log
    await supabase.from("audit_logs").insert({
      workspace_id: workspaceId,
      user_id: null,
      action: "ingest",
      resource_type: "event",
      resource_id: event.id,
      details: {
        agent_id,
        event_type,
        severity,
        violations_count: violations.length,
      },
      ip_address: req.headers['x-forwarded-for'] || null,
    });

    return res.status(200).json({
      success: true,
      event_id: event.id,
      violations: violations.map((v) => ({
        policy: v.policy_name,
        rule: v.violation.rule_type,
        message: v.violation.message,
      })),
    });

  } catch (err: any) {
    return res.status(500).json({ error: "Internal server error", detail: err.message });
  }
}
