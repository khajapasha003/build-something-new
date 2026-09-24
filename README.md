# PreLaunchQA

PreLaunchQA tests AI-built web apps like a real user before launch — it walks signup, login, forms and a test-mode checkout in a real browser, and returns every finding with a screenshot, a video and a fix prompt.

> This repository is edited only through [Lovable](https://lovable.dev). Do not push manual changes; edit the project in Lovable and changes sync here.

## Tech stack

- **TanStack Start** (React 19, Vite) — SSR app with `createServerFn` for app-internal server logic
- **Tailwind CSS v4** — theme tokens in `src/styles.css`
- **Lovable Cloud** (Supabase) — auth (email magic link + Google), Postgres with RLS, secret storage
- **shadcn/ui** — component primitives in `src/components/ui/`

## Folder structure

| Path                         | Purpose                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------- |
| `src/routes/`                | File-based routes. Public pages at top level; signed-in pages under `_authenticated/` |
| `src/lib/`                   | Server functions (`*.functions.ts`) and server-only logic (`*.server.ts`)             |
| `src/components/`            | Shared UI (site header/footer, signup form, shadcn primitives)                        |
| `src/integrations/supabase/` | Generated Supabase clients and auth middleware — do not edit                          |
| `src/assets/`                | CDN-backed media pointers (`*.asset.json`)                                            |
| `supabase/migrations/`       | Database migrations (see below)                                                       |
| `supabase/config.toml`       | Generated Lovable Cloud config — do not edit                                          |

## Database migrations

Migrations live in `supabase/migrations/`, one file per change, named `<timestamp>_<uuid>.sql` in apply order. They are created and applied only through Lovable Cloud tooling — never edited by hand after applying. Every table is created with its GRANTs, RLS enabled, and policies in the same migration.

Current migrations, in order:

1. `20260919104259_…` — `waitlist` table (pre-order / early-access signups, server-only access)
2. `20260919213026_…` — Phase 1: `profiles`, `apps`, `verification_attempts` tables with per-user RLS, the one-verified-owner-per-origin rule, and the auto-create-profile trigger
3. `20260919213048_…` — locks down the profile trigger function so only the system can run it

## Development

Everything runs inside Lovable — the preview, the database, auth and secrets are managed there. There is no local setup to run and no `.env` file to create.
