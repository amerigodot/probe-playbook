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
