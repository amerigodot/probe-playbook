import { describe, it, expect } from "vitest";
import {
  checkMaxResponseLength,
  checkPiiDetection,
  checkBlockedTopics,
  evaluateRules,
} from "@/lib/policy-engine";

describe("Policy Engine", () => {
  describe("checkMaxResponseLength", () => {
    it("returns null when response is under the limit", () => {
      const result = checkMaxResponseLength(
        { response: "short answer" },
        { max_chars: 100 }
      );
      expect(result).toBeNull();
    });

    it("returns a violation when response exceeds the limit", () => {
      const result = checkMaxResponseLength(
        { response: "x".repeat(201) },
        { max_chars: 200 }
      );
      expect(result).not.toBeNull();
      expect(result!.rule_type).toBe("max_response_length");
      expect(result!.details.length).toBe(201);
      expect(result!.details.limit).toBe(200);
    });

    it("falls back to output field if response is missing", () => {
      const result = checkMaxResponseLength(
        { output: "y".repeat(50) },
        { max_chars: 10 }
      );
      expect(result).not.toBeNull();
    });

    it("uses default 2000 char limit when max_chars not specified", () => {
      const result = checkMaxResponseLength(
        { response: "a".repeat(1999) },
        {}
      );
      expect(result).toBeNull();
    });
  });

  describe("checkPiiDetection", () => {
    it("detects email addresses", () => {
      const result = checkPiiDetection(
        { response: "Contact me at user@example.com" },
        { categories: ["email"] }
      );
      expect(result).not.toBeNull();
      expect(result!.rule_type).toBe("pii_detection");
      expect(result!.message).toContain("email");
    });

    it("detects SSNs", () => {
      const result = checkPiiDetection(
        { response: "SSN is 123-45-6789" },
        { categories: ["ssn"] }
      );
      expect(result).not.toBeNull();
      expect(result!.details.categories_found).toHaveProperty("ssn");
    });

    it("returns null when no PII is found", () => {
      const result = checkPiiDetection(
        { response: "Hello, how can I help you?" },
        { categories: ["email", "ssn"] }
      );
      expect(result).toBeNull();
    });

    it("redacts matched values (only first 4 chars + ***)", () => {
      const result = checkPiiDetection(
        { response: "Email: secret@example.com" },
        { categories: ["email"] }
      );
      expect(result).not.toBeNull();
      const found = result!.details.categories_found as Record<string, string[]>;
      expect(found.email[0]).toMatch(/^.{4}\*\*\*$/);
    });

    it("checks all categories by default if none specified", () => {
      const result = checkPiiDetection(
        { response: "SSN: 111-22-3333, email: a@b.com" },
        {}
      );
      expect(result).not.toBeNull();
      expect(result!.message).toContain("ssn");
      expect(result!.message).toContain("email");
    });
  });

  describe("checkBlockedTopics", () => {
    it("detects blocked topics case-insensitively", () => {
      const result = checkBlockedTopics(
        { response: "Let me tell you about CompetitorX" },
        { topics: ["competitorx", "lawsuit"] }
      );
      expect(result).not.toBeNull();
      expect(result!.details.matched_topics).toEqual(["competitorx"]);
    });

    it("returns null when no blocked topics found", () => {
      const result = checkBlockedTopics(
        { response: "Here is your refund policy info" },
        { topics: ["competitor", "lawsuit"] }
      );
      expect(result).toBeNull();
    });

    it("returns null when topics list is empty", () => {
      const result = checkBlockedTopics(
        { response: "anything" },
        { topics: [] }
      );
      expect(result).toBeNull();
    });
  });

  describe("evaluateRules", () => {
    it("returns all violations from multiple rules", () => {
      const rules = [
        { type: "pii_detection", params: { categories: ["email"] } },
        { type: "max_response_length", params: { max_chars: 10 } },
      ];
      const payload = { response: "Contact user@example.com for details about the issue" };
      const violations = evaluateRules(rules, payload);
      expect(violations).toHaveLength(2);
      expect(violations.map((v) => v.rule_type)).toContain("pii_detection");
      expect(violations.map((v) => v.rule_type)).toContain("max_response_length");
    });

    it("returns empty array when no rules match", () => {
      const rules = [
        { type: "blocked_topics", params: { topics: ["secret"] } },
      ];
      const violations = evaluateRules(rules, { response: "Hello world" });
      expect(violations).toHaveLength(0);
    });

    it("skips unknown rule types gracefully", () => {
      const rules = [
        { type: "nonexistent_rule", params: {} },
        { type: "blocked_topics", params: { topics: ["test"] } },
      ];
      const violations = evaluateRules(rules, { response: "this is a test" });
      expect(violations).toHaveLength(1);
    });
  });
});
