# Contributing

> Guidelines for contributing to AgentOps.

---

## Table of Contents

- [Code Style & Linting](#code-style--linting)
- [Branch & PR Workflow](#branch--pr-workflow)
- [Running Tests](#running-tests)
- [Adding New Policy Rule Checkers](#adding-new-policy-rule-checkers)
- [Database Migrations](#database-migrations)
- [Design System](#design-system)

---

## Code Style & Linting

- **Language:** TypeScript (strict mode).
- **Linter:** ESLint with `eslint-plugin-react-hooks` and `eslint-plugin-react-refresh`.
- **Formatter:** Follow the existing code style (2-space indentation, semicolons, double quotes for JSX).

```bash
# Run the linter
npm run lint
```

- All new components should be placed in `src/components/` (or `src/components/ui/` for primitives).
- All new pages should be placed in `src/pages/`.
- Hooks go in `src/hooks/`.
- Context providers go in `src/contexts/`.

---

## Branch & PR Workflow

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Make your changes and commit with descriptive messages.
3. Push and open a pull request.
4. Ensure linting passes and tests are green before requesting review.

---

## Running Tests

```bash
# Run all tests
npm test

# Watch mode for development
npm run test:watch
```

- Tests use **Vitest** + **jsdom** + **@testing-library/react**.
- Test files go in `src/test/` or co-located with the component as `*.test.ts(x)`.

---

## Adding New Policy Rule Checkers

The policy engine is extensible. To add a new rule type:

1. **Define the checker function** in `supabase/functions/ingest-events/index.ts`:

   ```typescript
   function checkYourRule(
     payload: Record<string, unknown>,
     params: Record<string, unknown>
   ): Violation | null {
     // Your logic here
     // Return null if no violation, or a Violation object
     return null;
   }
   ```

2. **Register it** in the `RULE_CHECKERS` map:

   ```typescript
   const RULE_CHECKERS = {
     // ...existing checkers
     your_rule_type: checkYourRule,
   };
   ```

3. **Use it in a policy** `rule_config`:

   ```json
   {
     "rules": [
       { "type": "your_rule_type", "params": { "threshold": 42 } }
     ]
   }
   ```

4. **Test it** by sending an event via curl and verifying the violation response.

---

## Database Migrations

- Schema changes are managed via SQL migration files in `supabase/migrations/`.
- **Never** edit auto-generated files:
  - `src/integrations/supabase/types.ts`
  - `src/integrations/supabase/client.ts`
  - `supabase/config.toml`
  - `.env`
- Always add RLS policies to new tables.
- Use security-definer functions when checking roles to avoid recursive RLS issues.

---

## Design System

- **Colors:** Use HSL-based CSS custom properties defined in `src/index.css`. Never use hardcoded color values in components.
- **Components:** Build on top of shadcn/ui primitives in `src/components/ui/`.
- **Tokens:** Use Tailwind semantic classes: `bg-background`, `text-foreground`, `bg-primary`, `text-muted-foreground`, etc.
- **Icons:** Use `lucide-react` for all icons.
- **Spacing:** Follow the existing spacing patterns in the codebase.
