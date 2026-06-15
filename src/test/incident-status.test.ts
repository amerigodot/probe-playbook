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
