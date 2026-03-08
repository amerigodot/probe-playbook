# Deployment

> How to deploy AgentOps to production.

---

## Table of Contents

- [Lovable Cloud (Default)](#lovable-cloud-default)
- [Frontend Deployment](#frontend-deployment)
- [Edge Function Deployment](#edge-function-deployment)
- [Database Migrations](#database-migrations)
- [Custom Domains](#custom-domains)

---

## Lovable Cloud (Default)

AgentOps is deployed via **Lovable Cloud**, which provides a fully managed stack:

- **Frontend** — Static SPA hosted on Lovable's CDN with automatic SSL.
- **Backend** — Supabase (PostgreSQL + Auth + Edge Functions) provisioned automatically.
- **Secrets** — Managed via Lovable Cloud's secrets manager (never stored in code).

---

## Frontend Deployment

- Frontend changes (UI, components, styles) are deployed by clicking **Publish → Update** in the Lovable editor.
- The build runs `vite build` and deploys the output to the CDN.
- Published apps are accessible at `https://<project-slug>.lovable.app` or a custom domain.

> **Note:** Frontend changes are NOT live until you click Publish. This is different from backend changes.

---

## Edge Function Deployment

- Edge functions (in `supabase/functions/`) are deployed **automatically** when code is saved.
- No manual deploy step is needed.
- Functions run on Deno and have access to secrets configured in Lovable Cloud.

### Testing Edge Functions

- Use the Lovable Cloud tools or `curl` to test endpoints directly.
- Check edge function logs in the Lovable Cloud UI for debugging.

---

## Database Migrations

- Schema changes are managed via migration files in `supabase/migrations/`.
- Migrations are applied automatically by Lovable Cloud.
- **Test vs Live environments:** Database writes in the editor only affect the Test environment. Publishing deploys schema changes to Live, but data is never synced between environments.

### Destructive Changes

Before removing columns or tables, check if the Live environment has existing data that needs to be preserved. If so, run a data migration query in the Live environment before publishing.

---

## Custom Domains

1. Go to **Project → Settings → Domains** in Lovable.
2. Add your custom domain (e.g., `agentops.yourcompany.com`).
3. Configure DNS as instructed (CNAME record).
4. SSL is provisioned automatically.

> Custom domains require a paid Lovable plan.
