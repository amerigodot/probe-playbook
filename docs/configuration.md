# Configuration

> Reference for all environment variables, secrets, and settings.

---

## Table of Contents

- [Frontend Environment Variables](#frontend-environment-variables)
- [Edge Function Secrets](#edge-function-secrets)
- [API Key Management](#api-key-management)
- [Auth Configuration](#auth-configuration)

---

## Frontend Environment Variables

These are set in the `.env` file (auto-managed by Lovable Cloud) and bundled into the frontend via Vite's `import.meta.env`:

| Variable | Purpose | Sensitive? |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL (e.g., `https://xxx.supabase.co`) | No (public) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key for client-side access | No (publishable) |
| `VITE_SUPABASE_PROJECT_ID` | Supabase project ID | No (public) |

These are **publishable** keys — they are designed to be included in client bundles. Security is enforced by RLS policies on the database, not by keeping these keys secret.

---

## Edge Function Secrets

These are stored in Lovable Cloud's secrets manager and available to edge functions via `Deno.env.get()`:

| Secret | Purpose | How to Obtain |
|---|---|---|
| `SUPABASE_URL` | Internal Supabase project URL | Auto-configured by Lovable Cloud |
| `SUPABASE_SERVICE_ROLE_KEY` | Privileged database access (bypasses RLS) | Auto-configured by Lovable Cloud |
| `SUPABASE_ANON_KEY` | Public anon key | Auto-configured by Lovable Cloud |
| `SUPABASE_DB_URL` | Direct PostgreSQL connection string | Auto-configured by Lovable Cloud |
| `LOVABLE_API_KEY` | Lovable platform API key | Auto-configured by Lovable Cloud |

> **⚠️ Never expose `SUPABASE_SERVICE_ROLE_KEY` in client-side code.** It bypasses all Row-Level Security policies.

---

## API Key Management

External agents authenticate to the `ingest-events` endpoint using API keys.

### How It Works

1. An admin creates an API key in the console (future Settings UI feature).
2. The raw key is shown once to the user; only the **SHA-256 hash** is stored in the `api_keys` table.
3. When an agent sends a request, the edge function hashes the provided key and matches it against stored hashes via `validate_api_key()`.
4. Keys can be **revoked** by setting `revoked_at` on the `api_keys` row.

### `api_keys` Table Schema

| Column | Type | Description |
|---|---|---|
| `id` | `uuid` | Primary key |
| `workspace_id` | `uuid` | FK to `workspaces` |
| `key_hash` | `text` | SHA-256 hash of the raw API key |
| `label` | `text` | Human-readable label (default: "Default") |
| `created_by` | `uuid` | The user who created the key |
| `created_at` | `timestamptz` | Creation timestamp |
| `revoked_at` | `timestamptz` | Revocation timestamp (null = active) |

---

## Auth Configuration

Authentication is handled by Supabase Auth with the following defaults:

| Setting | Default | Description |
|---|---|---|
| Email signup | Enabled | Users can create accounts with email/password |
| Auto-confirm email | **Disabled** | Users must verify their email before signing in |
| Anonymous users | Disabled | No anonymous sign-ups allowed |
| Password reset | Enabled | Via `/forgot-password` → email link → `/reset-password` |

### Auto-Created Resources

When a new user signs up, two database triggers fire:

1. **`handle_new_user()`** — Inserts a row in `profiles` with the user's display name.
2. **`handle_new_user_workspace()`** — Creates a default workspace and adds the user as `owner`.

This means every new user immediately has a workspace to work in.
