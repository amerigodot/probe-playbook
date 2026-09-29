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

import { describe, it, expect, beforeEach } from "vitest";
import { createMockSupabaseClient, mockStoreInstance } from "@/lib/mock-store";
import { DEMO_API_KEY_RAW } from "@/lib/demo-data";

describe("MockStore (In-Browser Relational Store)", () => {
  let store: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockStoreInstance.reset(false);
    store = createMockSupabaseClient();
  });

  it("loads seeded workspaces and agents correctly", async () => {
    const { data: workspaces, error: wsErr } = await store.from("workspaces").select("*");
    expect(wsErr).toBeNull();
    expect(workspaces).toBeDefined();
    expect(workspaces!.length).toBeGreaterThan(0);
    expect(workspaces![0].slug).toBe("enterprise-control-plane");

    const { data: agents, error: agErr } = await store.from("agents").select("*");
    expect(agErr).toBeNull();
    expect(agents).toBeDefined();
    expect(agents!.length).toBeGreaterThanOrEqual(2);
  });

  it("resolves foreign key joins on incident queries", async () => {
    const { data: incidents, error } = await store
      .from("incidents")
      .select("*, workspaces(id, name, slug)");

    expect(error).toBeNull();
    expect(incidents).toBeDefined();
    expect(incidents!.length).toBeGreaterThan(0);

    const firstIncident = incidents![0];
    expect(firstIncident.workspaces).toBeDefined();
    expect(firstIncident.workspaces.name).toBe("Enterprise AI Control Plane");
    expect(firstIncident.workspaces.slug).toBe("enterprise-control-plane");
  });

  it("validates demo API key via RPC", async () => {
    const { data: validResult, error: rpcErr } = await store.rpc("validate_api_key", {
      api_key: DEMO_API_KEY_RAW
    });

    expect(rpcErr).toBeNull();
    expect(validResult).toBe("00000000-0000-0000-0000-000000000001");

    const { data: invalidResult } = await store.rpc("validate_api_key", {
      api_key: "invalid_key_999"
    });
    expect(invalidResult).toBeNull();
  });

  it("supports insert, query with filters, and single() extraction", async () => {
    const testId = "evt_vitest_unit_test";
    const { data: inserted, error: insertErr } = await store.from("events").insert({
      id: testId,
      workspace_id: "00000000-0000-0000-0000-000000000001",
      event_type: "unit_test_event",
      severity: "info",
      payload_summary: "Vitest verification payload"
    }).select("id").single();

    expect(insertErr).toBeNull();
    expect(inserted).toBeDefined();
    expect(inserted!.id).toBe(testId);

    const { data: retrieved, error: getErr } = await store
      .from("events")
      .select("*")
      .eq("id", testId)
      .single();

    expect(getErr).toBeNull();
    expect(retrieved).toBeDefined();
    expect(retrieved!.event_type).toBe("unit_test_event");
    expect(retrieved!.payload_summary).toBe("Vitest verification payload");
  });

  it("supports ordering and limiting records", async () => {
    const { data: limitedEvents, error } = await store
      .from("events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(3);

    expect(error).toBeNull();
    expect(limitedEvents).toBeDefined();
    expect(limitedEvents!.length).toBeLessThanOrEqual(3);
  });
});
