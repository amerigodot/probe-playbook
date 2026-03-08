// Policy engine — extracted from ingest-events edge function for testability

// ---------- PII regex patterns ----------
export const PII_PATTERNS: Record<string, RegExp> = {
  email: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  phone: /\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b/g,
  credit_card: /\b(?:\d[ -]*?){13,19}\b/g,
};

export interface PolicyRule {
  type: string;
  params: Record<string, unknown>;
}

export interface Violation {
  rule_type: string;
  message: string;
  details: Record<string, unknown>;
}

export function checkMaxResponseLength(
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

export function checkPiiDetection(
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

export function checkBlockedTopics(
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

export const RULE_CHECKERS: Record<
  string,
  (payload: Record<string, unknown>, params: Record<string, unknown>) => Violation | null
> = {
  max_response_length: checkMaxResponseLength,
  pii_detection: checkPiiDetection,
  blocked_topics: checkBlockedTopics,
};

/**
 * Evaluate a set of policy rules against an event payload.
 * Returns all violations found.
 */
export function evaluateRules(
  rules: PolicyRule[],
  payload: Record<string, unknown>
): Violation[] {
  const violations: Violation[] = [];
  for (const rule of rules) {
    const checker = RULE_CHECKERS[rule.type];
    if (!checker) continue;
    const violation = checker(payload, rule.params ?? {});
    if (violation) violations.push(violation);
  }
  return violations;
}
