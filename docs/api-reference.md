# API Reference

> Reference documentation for the AgentOps external API.

---

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Endpoints](#endpoints)
  - [POST /functions/v1/ingest-events](#post-functionsv1ingest-events)
- [Error Codes](#error-codes)

---

## Overview

AgentOps exposes a single REST endpoint for external AI agents to report telemetry. The endpoint is implemented as a Supabase Edge Function and is available at:

```
https://<project-id>.supabase.co/functions/v1/ingest-events
```

---

## Authentication

All requests must include an `x-api-key` header containing a valid, non-revoked API key.

The key is hashed with SHA-256 on the server and matched against the `api_keys` table using the `validate_api_key()` database function. If the key is invalid or revoked, the request returns `403`.

```
x-api-key: ak_live_abc123def456...
```

---

## Endpoints

### POST /functions/v1/ingest-events

Ingest an agent activity event, evaluate attached policies, and return any violations.

#### Headers

| Header | Required | Description |
|---|---|---|
| `Content-Type` | Yes | Must be `application/json` |
| `x-api-key` | Yes | A valid API key for the workspace |

#### Request Body

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `agent_id` | `uuid` | **Yes** | — | The registered agent's ID |
| `event_type` | `string` | **Yes** | — | Event category (e.g., `chat_response`, `tool_call`, `error`) |
| `severity` | `string` | No | `"info"` | One of: `info`, `warning`, `error`, `critical` |
| `session_id` | `string` | No | `null` | Optional session/conversation identifier |
| `payload_summary` | `string` | No | `null` | Human-readable summary of the event |
| `raw_details` | `object` | No | `{}` | Arbitrary JSON payload with event details |

#### Example Request

```bash
curl -X POST \
  https://<project-id>.supabase.co/functions/v1/ingest-events \
  -H "Content-Type: application/json" \
  -H "x-api-key: ak_live_abc123def456" \
  -d '{
    "agent_id": "fa8f0f7f-1234-5678-9abc-def012345678",
    "event_type": "chat_response",
    "severity": "info",
    "session_id": "conv-2026-03-08-001",
    "payload_summary": "User asked about account balance",
    "raw_details": {
      "input": "What is my account balance?",
      "response": "Your current balance is $1,234.56.",
      "model": "gpt-4",
      "latency_ms": 1200
    }
  }'
```

#### Success Response (200)

```json
{
  "success": true,
  "event_id": "e1a2b3c4-...",
  "violations": [
    {
      "policy": "No PII Exposure",
      "rule": "pii_detection",
      "message": "PII detected: phone"
    }
  ]
}
```

If no violations are detected, `violations` is an empty array.

#### Error Responses

| Status | Body | Cause |
|---|---|---|
| `400` | `{"error": "agent_id and event_type are required"}` | Missing required fields |
| `401` | `{"error": "Missing x-api-key header"}` | No API key provided |
| `403` | `{"error": "Invalid or revoked API key"}` | Key not found or revoked |
| `404` | `{"error": "Agent not found in this workspace"}` | Agent ID doesn't exist or doesn't belong to the key's workspace |
| `405` | `{"error": "Method not allowed"}` | Non-POST request (except OPTIONS for CORS) |
| `500` | `{"error": "Failed to insert event", "detail": "..."}` | Database insertion error |
| `500` | `{"error": "Internal server error", "detail": "..."}` | Unexpected server error |

---

## Error Codes

| Code | Meaning |
|---|---|
| `400` | Bad Request — missing or invalid input |
| `401` | Unauthorized — no API key |
| `403` | Forbidden — invalid or revoked API key |
| `404` | Not Found — agent doesn't exist in the workspace |
| `405` | Method Not Allowed — only POST is accepted |
| `500` | Internal Server Error — check `detail` field |

---

## CORS

The endpoint supports CORS preflight (`OPTIONS`) and allows all origins (`*`). This is intended for server-to-server use; browser clients should use the Supabase JS client instead.

---

## Policy Evaluation

When an event is ingested, the function:

1. Looks up all policies attached to the agent via the `agent_policies` join table.
2. For each policy, iterates over the `rules` array in `rule_config`.
3. Runs the matching checker function for each rule type.
4. If a checker returns a violation, it's recorded in `policy_violations` and included in the response.

### Supported Rule Types

| Type | Params | Description |
|---|---|---|
| `pii_detection` | `categories?: string[]` | Scans payload for PII patterns (email, SSN, phone, credit card). Defaults to all categories. |
| `max_response_length` | `max_chars?: number` | Flags responses exceeding the character limit. Default: 2000. |
| `blocked_topics` | `topics: string[]` | Flags payloads containing any of the listed keywords (case-insensitive). |
