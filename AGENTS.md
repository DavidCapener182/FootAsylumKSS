# AGENTS.md

## Cursor Cloud specific instructions

### Overview

This is a Next.js 14 (App Router) web application — the **KSS x Footasylum Assurance Platform**. It uses Supabase (hosted cloud instance, not local) for PostgreSQL, Auth, and Storage. See `README.md` for full feature list and project structure.

### Running the app

- `npm run dev` — starts the Next.js dev server on port 3000.
- The app requires three Supabase env vars in `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. Without valid keys the app renders correctly but all Supabase operations (auth, data) return "Invalid API key".
- `OPENAI_API_KEY` is optional (AI features degrade gracefully).

### Lint / Type-check / Test

- `npm run lint` — ESLint (warnings only, no errors in clean repo).
- `npm run type-check` — TypeScript strict-mode check (`tsc --noEmit`).
- `npm run test:run` — Vitest unit tests (4 test files, 24 tests). Tests are self-contained and do not require Supabase credentials.

### Gotchas

- There is no local Supabase setup (no `supabase/config.toml`). The app exclusively uses the hosted instance at `fwnzpafwfaiynrclwtnh.supabase.co`.
- No `.env.local.example` file exists in the repo — create `.env.local` manually using the variable names above.
- `next.config.js` uses the deprecated `experimental.serverComponentsExternalPackages` key; this produces a warning on `npm run dev` but works fine.
- Puppeteer (for PDF generation) needs a Chromium binary; the feature is optional and only used in 2 API routes.
