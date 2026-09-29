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

import { 
  getInitialDemoData, 
  DEMO_WORKSPACE_ID, 
  DEMO_USER_ID, 
  DEMO_API_KEY_RAW,
  DEMO_API_KEY_HASH 
} from "./demo-data";

const STORAGE_KEY = "agentops_demo_store_v2";

export interface DemoStoreData {
  workspaces: any[];
  profiles: any[];
  workspace_members: any[];
  agents: any[];
  policies: any[];
  agent_policies: any[];
  events: any[];
  policy_violations: any[];
  incidents: any[];
  incident_comments: any[];
  incident_events: any[];
  incident_agents: any[];
  audit_logs: any[];
  api_keys: any[];
}

export class MockStore {
  private data: DemoStoreData;

  constructor() {
    this.data = this.loadFromStorage();
  }

  private hasStorage(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  }

  private loadFromStorage(): DemoStoreData {
    if (this.hasStorage()) {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored) {
          return JSON.parse(stored);
        }
      } catch (e) {
        console.warn("Failed to parse demo data from localStorage, resetting...", e);
      }
    }
    const initial = getInitialDemoData();
    this.saveToStorage(initial);
    return initial;
  }

  private saveToStorage(data: DemoStoreData) {
    if (this.hasStorage()) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        // Also cache demo API key so Playground loads it automatically
        window.localStorage.setItem(`op_raw_key_${DEMO_WORKSPACE_ID}`, DEMO_API_KEY_RAW);
      } catch (e) {
        console.warn("Failed to persist demo data to localStorage", e);
      }
    }
  }

  public getTable(tableName: keyof DemoStoreData): any[] {
    return this.data[tableName] || [];
  }

  public setTable(tableName: keyof DemoStoreData, rows: any[]) {
    this.data[tableName] = rows;
    this.saveToStorage(this.data);
  }

  public reset(reload: boolean = false) {
    const initial = getInitialDemoData();
    this.data = initial;
    this.saveToStorage(initial);
    if (reload && typeof window !== 'undefined' && window.location) {
      window.location.reload();
    }
  }
}

export const mockStoreInstance = new MockStore();

// Query Builder supporting Supabase's chained API
export class MockQueryBuilder {
  private tableName: keyof DemoStoreData;
  private filters: Array<(item: any) => boolean> = [];
  private orderConfig: { column: string; ascending: boolean } | null = null;
  private limitCount: number | null = null;
  private selectColumns: string = "*";
  private isCountExact: boolean = false;
  private isHead: boolean = false;
  private isSingle: boolean = false;
  private isMaybeSingle: boolean = false;
  private mutationType: "select" | "insert" | "update" | "delete" = "select";
  private mutationValues: any = null;

  constructor(tableName: string) {
    this.tableName = tableName as keyof DemoStoreData;
  }

  select(columns: string = "*", options?: { count?: "exact" | "planned" | "estimated"; head?: boolean }) {
    this.selectColumns = columns;
    if (options?.count === "exact") this.isCountExact = true;
    if (options?.head) this.isHead = true;
    return this;
  }

  insert(values: any) {
    this.mutationType = "insert";
    this.mutationValues = Array.isArray(values) ? values : [values];
    return this;
  }

  update(values: any) {
    this.mutationType = "update";
    this.mutationValues = values;
    return this;
  }

  delete() {
    this.mutationType = "delete";
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push((item) => item[column] === value);
    return this;
  }

  neq(column: string, value: any) {
    this.filters.push((item) => item[column] !== value);
    return this;
  }

  in(column: string, values: any[]) {
    const set = new Set(values);
    this.filters.push((item) => set.has(item[column]));
    return this;
  }

  gte(column: string, value: any) {
    this.filters.push((item) => item[column] >= value);
    return this;
  }

  lte(column: string, value: any) {
    this.filters.push((item) => item[column] <= value);
    return this;
  }

  gt(column: string, value: any) {
    this.filters.push((item) => item[column] > value);
    return this;
  }

  lt(column: string, value: any) {
    this.filters.push((item) => item[column] < value);
    return this;
  }

  ilike(column: string, pattern: string) {
    const regex = new RegExp(pattern.replace(/%/g, ".*"), "i");
    this.filters.push((item) => regex.test(String(item[column] ?? "")));
    return this;
  }

  is(column: string, value: any) {
    this.filters.push((item) => item[column] === value);
    return this;
  }

  filter(column: string, operator: string, value: any) {
    if (operator === "is") return this.is(column, value);
    if (operator === "eq") return this.eq(column, value);
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderConfig = { column, ascending: options?.ascending ?? true };
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    return this;
  }

  private resolveJoins(item: any, columns: string): any {
    const result = { ...item };

    // Resolve workspaces(...)
    if (columns.includes("workspaces(") && item.workspace_id) {
      const ws = mockStoreInstance.getTable("workspaces").find((w) => w.id === item.workspace_id);
      result.workspaces = ws ? { id: ws.id, name: ws.name, slug: ws.slug } : null;
    }

    // Resolve profiles(...)
    if (columns.includes("profiles(") && item.user_id) {
      const prof = mockStoreInstance.getTable("profiles").find((p) => p.id === item.user_id);
      result.profiles = prof ? { display_name: prof.display_name, avatar_url: prof.avatar_url } : null;
    }

    // Resolve agents(...)
    if (columns.includes("agents(")) {
      const agentId = item.agent_id;
      if (agentId) {
        const ag = mockStoreInstance.getTable("agents").find((a) => a.id === agentId);
        result.agents = ag ? { id: ag.id, name: ag.name, environment: ag.environment } : null;
      }
    }

    // Resolve policies(...)
    if (columns.includes("policies(")) {
      const policyId = item.policy_id;
      if (policyId) {
        const pol = mockStoreInstance.getTable("policies").find((p) => p.id === policyId);
        result.policies = pol ? { id: pol.id, name: pol.name, rule_config: pol.rule_config } : null;
      }
    }

    // Resolve events(...)
    if (columns.includes("events(")) {
      const eventId = item.event_id;
      if (eventId) {
        const ev = mockStoreInstance.getTable("events").find((e) => e.id === eventId);
        result.events = ev
          ? {
              id: ev.id,
              event_type: ev.event_type,
              severity: ev.severity,
              payload_summary: ev.payload_summary,
              created_at: ev.created_at,
              raw_details: ev.raw_details,
            }
          : null;
      }
    }

    return result;
  }

  private execute(): { data: any; error: any; count?: number } {
    let rows = [...mockStoreInstance.getTable(this.tableName)];

    if (this.mutationType === "insert") {
      const newItems = this.mutationValues.map((val: any) => ({
        id: val.id || `mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        created_at: val.created_at || new Date().toISOString(),
        updated_at: val.updated_at || new Date().toISOString(),
        ...val,
      }));
      rows = [...newItems, ...rows];
      mockStoreInstance.setTable(this.tableName, rows);

      if (this.isSingle || this.isMaybeSingle) {
        return { data: newItems[0] || null, error: null };
      }
      return { data: newItems, error: null };
    }

    if (this.mutationType === "update") {
      const updatedList: any[] = [];
      rows = rows.map((item) => {
        const matches = this.filters.every((fn) => fn(item));
        if (matches) {
          const updated = { ...item, ...this.mutationValues, updated_at: new Date().toISOString() };
          updatedList.push(updated);
          return updated;
        }
        return item;
      });
      mockStoreInstance.setTable(this.tableName, rows);
      return { data: this.isSingle ? (updatedList[0] || null) : updatedList, error: null };
    }

    if (this.mutationType === "delete") {
      const remaining = rows.filter((item) => !this.filters.every((fn) => fn(item)));
      mockStoreInstance.setTable(this.tableName, remaining);
      return { data: null, error: null };
    }

    // SELECT query
    let filtered = rows.filter((item) => this.filters.every((fn) => fn(item)));
    const totalCount = filtered.length;

    if (this.isHead) {
      return { data: null, count: totalCount, error: null };
    }

    if (this.orderConfig) {
      const { column, ascending } = this.orderConfig;
      filtered.sort((a, b) => {
        const valA = a[column];
        const valB = b[column];
        if (valA === valB) return 0;
        if (valA == null) return ascending ? -1 : 1;
        if (valB == null) return ascending ? 1 : -1;
        return ascending ? (valA > valB ? 1 : -1) : valA < valB ? 1 : -1;
      });
    }

    if (this.limitCount !== null) {
      filtered = filtered.slice(0, this.limitCount);
    }

    const resolved = filtered.map((item) => this.resolveJoins(item, this.selectColumns));

    if (this.isSingle) {
      return { data: resolved[0] || null, error: resolved[0] ? null : { message: "No rows found" }, count: totalCount };
    }

    if (this.isMaybeSingle) {
      return { data: resolved[0] || null, error: null, count: totalCount };
    }

    return { data: resolved, count: this.isCountExact ? totalCount : undefined, error: null };
  }

  then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    const res = this.execute();
    return Promise.resolve(res).then(onfulfilled, onrejected);
  }
}

// Mock Supabase Client API
export function createMockSupabaseClient() {
  const demoUser = {
    id: DEMO_USER_ID,
    email: "recruiter.evaluator@enterprise-ai.internal",
    user_metadata: {
      display_name: "Lead AI Quality Engineer (Showcase Evaluator)",
    },
    app_metadata: { provider: "email" },
    aud: "authenticated",
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  };

  const demoSession = {
    access_token: "mock_demo_jwt_token_showcase",
    token_type: "bearer",
    expires_in: 360000,
    refresh_token: "mock_refresh_token",
    user: demoUser,
  };

  return {
    from(tableName: string) {
      return new MockQueryBuilder(tableName);
    },

    async rpc(fnName: string, args: any = {}) {
      if (fnName === "log_audit") {
        const auditRow = {
          id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          workspace_id: args._workspace_id || DEMO_WORKSPACE_ID,
          user_id: DEMO_USER_ID,
          action: args._action || "read",
          resource_type: args._resource_type || "workspace",
          resource_id: args._resource_id || null,
          details: args._details || {},
          created_at: new Date().toISOString(),
        };
        const current = mockStoreInstance.getTable("audit_logs");
        mockStoreInstance.setTable("audit_logs", [auditRow, ...current]);
        return { data: null, error: null };
      }

      if (fnName === "validate_api_key") {
        const keys = mockStoreInstance.getTable("api_keys");
        const keyHash = args?._key_hash || args?.key_hash;
        const rawKey = args?.api_key;
        const found = keys.find(
          (k) =>
            !k.revoked_at &&
            (k.key_hash === keyHash ||
             (rawKey && (rawKey === DEMO_API_KEY_RAW || k.key_hash.includes(rawKey))))
        );
        return { data: found ? found.workspace_id : null, error: null };
      }

      return { data: null, error: null };
    },

    auth: {
      async getUser() {
        return { data: { user: demoUser }, error: null };
      },
      async getSession() {
        return { data: { session: demoSession }, error: null };
      },
      onAuthStateChange(callback: (event: string, session: any) => void) {
        setTimeout(() => callback("SIGNED_IN", demoSession), 0);
        return {
          data: {
            subscription: {
              unsubscribe: () => {},
            },
          },
        };
      },
      async signInWithPassword() {
        return { data: { user: demoUser, session: demoSession }, error: null };
      },
      async signUp() {
        return { data: { user: demoUser, session: demoSession }, error: null };
      },
      async signOut() {
        return { error: null };
      },
      async resetPasswordForEmail() {
        return { data: {}, error: null };
      },
      async updateUser() {
        return { data: { user: demoUser }, error: null };
      },
    },
  };
}
