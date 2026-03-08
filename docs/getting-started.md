# Getting Started

> Step-by-step guide to set up AgentOps for local development.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Clone & Install](#clone--install)
- [Environment Variables](#environment-variables)
- [Running Locally](#running-locally)
- [Running Tests](#running-tests)
- [Creating Your First Account](#creating-your-first-account)

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | ≥ 18 | Required for Vite and build tooling |
| npm or Bun | Latest | Bun is faster; npm works fine |
| Git | Any | For cloning the repository |

No Supabase CLI is needed for frontend development — the app connects to the hosted Supabase project via environment variables.

---

## Clone & Install

```bash
git clone <repo-url>
cd agentops
npm install
```

---

## Environment Variables

The project uses a `.env` file at the root with the following variables (auto-provided by Lovable Cloud):

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | The Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | The Supabase anon (public) key |
| `VITE_SUPABASE_PROJECT_ID` | The Supabase project ID |

These are **public/publishable** keys and are safe to include in the frontend bundle.

→ See [`configuration.md`](configuration.md) for the full secrets reference including edge function secrets.

---

## Running Locally

```bash
# Start the Vite dev server with hot-reload
npm run dev
```

The app will be available at **http://localhost:5173**.

### Other Commands

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run build:dev` | Development build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

---

## Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch
```

Tests use **Vitest** with **jsdom** and **@testing-library/react**.

---

## Creating Your First Account

1. Open `http://localhost:5173` — you'll be redirected to `/login`.
2. Click **"Create account"** to go to `/signup`.
3. Enter a display name, email, and password (min 6 characters).
4. After signup, a workspace is automatically created for you (named `<Your Name>'s Workspace`).
5. You'll land on the Dashboard — start by creating an Agent or Policy.

> **Note:** Email confirmation is enabled by default. In development, your Lovable Cloud project may have auto-confirm enabled for convenience.
