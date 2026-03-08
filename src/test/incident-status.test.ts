import { describe, it, expect } from "vitest";
import {
  canTransition,
  allowedTransitions,
  isClosingTransition,
} from "@/lib/incident-status";

describe("Incident Status Machine", () => {
  describe("canTransition", () => {
    it("allows open → investigating", () => {
      expect(canTransition("open", "investigating")).toBe(true);
    });

    it("blocks open → mitigated (must go through investigating)", () => {
      expect(canTransition("open", "mitigated")).toBe(false);
    });

    it("blocks open → closed directly", () => {
      expect(canTransition("open", "closed")).toBe(false);
    });

    it("allows investigating → mitigated", () => {
      expect(canTransition("investigating", "mitigated")).toBe(true);
    });

    it("allows investigating → open (revert)", () => {
      expect(canTransition("investigating", "open")).toBe(true);
    });

    it("allows mitigated → closed", () => {
      expect(canTransition("mitigated", "closed")).toBe(true);
    });

    it("allows mitigated → investigating (revert)", () => {
      expect(canTransition("mitigated", "investigating")).toBe(true);
    });

    it("allows closed → open (re-open)", () => {
      expect(canTransition("closed", "open")).toBe(true);
    });

    it("blocks closed → investigating", () => {
      expect(canTransition("closed", "investigating")).toBe(false);
    });
  });

  describe("allowedTransitions", () => {
    it("returns correct transitions for each status", () => {
      expect(allowedTransitions("open")).toEqual(["investigating"]);
      expect(allowedTransitions("investigating")).toEqual(["mitigated", "open"]);
      expect(allowedTransitions("mitigated")).toEqual(["closed", "investigating"]);
      expect(allowedTransitions("closed")).toEqual(["open"]);
    });
  });

  describe("isClosingTransition", () => {
    it("returns true only for closed", () => {
      expect(isClosingTransition("closed")).toBe(true);
      expect(isClosingTransition("open")).toBe(false);
      expect(isClosingTransition("mitigated")).toBe(false);
    });
  });
});
