# Troubleshooting

> Common issues and how to resolve them.

---

## Table of Contents

- [Authentication Issues](#authentication-issues)
- [Permission Denied (RLS)](#permission-denied-rls)
- [Edge Function Errors](#edge-function-errors)
- [Missing or Incomplete Data](#missing-or-incomplete-data)
- [Build Failures](#build-failures)
- [UI Issues](#ui-issues)

---

## Authentication Issues

### "Check your email to confirm your account" but no email received

- **Cause:** Email confirmation is enabled but the email provider may be slow or the email went to spam.
- **Fix:** Check your spam folder. If in development, the project admin can enable auto-confirm via auth settings.

### Redirected to `/login` after signup

- **Cause:** Email not confirmed yet, or session expired.
- **Fix:** Confirm your email via the link, then sign in again.

### Password reset link doesn't work

- **Cause:** The reset link may have expired (default: 1 hour).
- **Fix:** Request a new password reset from `/forgot-password`.

---

## Permission Denied (RLS)

### "new row violates row-level security policy"

- **Cause:** The current user doesn't have the required workspace role for the operation.
- **Fix:**
  1. Verify you're logged in (`auth.uid()` must be set).
  2. Check your workspace role — only `owner` and `admin` roles can create/update/delete most resources.
  3. Observers have read-only access.

### Data not appearing in tables

- **Cause:** RLS policies filter data by workspace membership. If you're not a member of the workspace, you won't see its data.
- **Fix:** Ensure you're viewing the correct workspace (check the workspace selector in the top bar).

---

## Edge Function Errors

### `ingest-events` returns 401 "Missing x-api-key header"

- **Cause:** The `x-api-key` header is not included in the request.
- **Fix:** Include the header: `-H "x-api-key: <your-key>"`.

### `ingest-events` returns 403 "Invalid or revoked API key"

- **Cause:** The API key doesn't match any active key in the `api_keys` table.
- **Fix:**
  1. Verify the key hasn't been revoked (`revoked_at` should be null).
  2. Ensure you're using the raw key, not the hash.
  3. Check that the key was created for the correct workspace.

### `ingest-events` returns 404 "Agent not found in this workspace"

- **Cause:** The `agent_id` doesn't exist or belongs to a different workspace than the API key.
- **Fix:** Verify the agent ID and that it was created in the same workspace as the API key.

---

## Missing or Incomplete Data

### Dashboard KPIs show 0

- **Cause:** No agents, events, or incidents have been created in this workspace yet.
- **Fix:** Create some test data to populate the dashboard.

### Query returns fewer rows than expected

- **Cause:** Supabase has a default limit of **1000 rows** per query.
- **Fix:** If you have more than 1000 records, implement pagination or use `.range()` in your queries.

### Events not showing violations

- **Cause:** No policies are attached to the agent, or the policy rules don't match the event payload.
- **Fix:**
  1. Check that the agent has policies attached (Policies → Policy Detail → Attached Agents).
  2. Verify the `rule_config` JSON has a `rules` array with valid rule types.

---

## Build Failures

### TypeScript errors after database schema changes

- **Cause:** The auto-generated `src/integrations/supabase/types.ts` may be out of sync.
- **Fix:** The types file is regenerated automatically. If it's stale, trigger a rebuild in Lovable.

### Missing dependency errors

- **Cause:** A new package was added but `npm install` wasn't run.
- **Fix:** Run `npm install` to install all dependencies.

---

## UI Issues

### Sidebar not rendering

- **Cause:** The component may be outside the `DashboardLayout` wrapper.
- **Fix:** Ensure the page route is nested under the protected layout route in `App.tsx`.

### Dark mode colors look wrong

- **Cause:** A component may be using hardcoded color classes instead of semantic tokens.
- **Fix:** Use Tailwind semantic classes (e.g., `bg-background`, `text-foreground`) instead of direct colors.
