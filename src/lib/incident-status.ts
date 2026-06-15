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

// Incident status machine — extracted for testability

export const STATUS_ORDER = ["open", "investigating", "mitigated", "closed"] as const;
export type IncidentStatus = (typeof STATUS_ORDER)[number];

export const STATUS_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  open: ["investigating"],
  investigating: ["mitigated", "open"],
  mitigated: ["closed", "investigating"],
  closed: ["open"],
};

/**
 * Returns true if transitioning from `from` to `to` is allowed.
 */
export function canTransition(from: IncidentStatus, to: IncidentStatus): boolean {
  return (STATUS_TRANSITIONS[from] ?? []).includes(to);
}

/**
 * Returns the list of valid next statuses from the current status.
 */
export function allowedTransitions(from: IncidentStatus): IncidentStatus[] {
  return STATUS_TRANSITIONS[from] ?? [];
}

/**
 * Returns true if closing (requires root cause).
 */
export function isClosingTransition(to: IncidentStatus): boolean {
  return to === "closed";
}
