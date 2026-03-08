import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ---------- PII regex patterns ----------
const PII_PATTERNS: Record<string, RegExp> = {
  email: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  phone: /\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b/g,
  credit_card: /\b(?:\d[ -]*?){13,19}\b/g,
};

// ---------- Policy rule checkers ----------
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
      // Redact matches for safety — only store count + first few chars
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

// ---------- Main handler ----------
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // --- Auth via x-api-key header (SHA-256 hashed, matched against api_keys table) ---
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing x-api-key header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Hash the key
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(apiKey));
    const keyHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Create service-role client for privileged operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Validate API key → get workspace_id
    const { data: wsId, error: keyError } = await supabase.rpc("validate_api_key", {
      _key_hash: keyHash,
    });

    if (keyError || !wsId) {
      return new Response(JSON.stringify({ error: "Invalid or revoked API key" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const workspaceId = wsId as string;

    // --- Parse and validate body ---
    const body = await req.json();
    const {
      agent_id,
      event_type,
      severity = "info",
      session_id = null,
      payload_summary = null,
      raw_details = {},
    } = body;

    if (!agent_id || !event_type) {
      return new Response(
        JSON.stringify({ error: "agent_id and event_type are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify agent belongs to this workspace
    const { data: agent, error: agentErr } = await supabase
      .from("agents")
      .select("id, workspace_id")
      .eq("id", agent_id)
      .eq("workspace_id", workspaceId)
      .single();

    if (agentErr || !agent) {
      return new Response(
        JSON.stringify({ error: "Agent not found in this workspace" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Insert event ---
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

    if (eventErr) {
      return new Response(JSON.stringify({ error: "Failed to insert event", detail: eventErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Check policies attached to this agent ---
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

    // --- Insert violations ---
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

    // --- Audit log ---
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
      ip_address: req.headers.get("x-forwarded-for") ?? req.headers.get("cf-connecting-ip") ?? null,
    });

    return new Response(
      JSON.stringify({
        success: true,
        event_id: event.id,
        violations: violations.map((v) => ({
          policy: v.policy_name,
          rule: v.violation.rule_type,
          message: v.violation.message,
        })),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal server error", detail: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
