# PreLaunchQA roadmap

- [x] Audit uploads (logo, brand sheet, build plan, demo video) and current project
- [x] Confirm available infrastructure: GitHub, Supabase, AWS Lightsail, GoDaddy (prelaunchqa.com)
- [x] Get plan approval
- [x] Phase 0 — brand system, landing page, waitlist + pre-order, legal page shells
  - [x] Brand tokens (Ink/Violet/Mint/Coral/Amber), Sora + Manrope, favicon from logo
  - [x] `waitlist` table, server-only RLS, 5-per-hour rate limit on hashed IP
  - [x] Routes `/`, `/preorder`, `/terms`, `/privacy` + demo video; verified 200/404 and one real submit
  - [ ] Publish + point prelaunchqa.com at it (needs your go-ahead)
- [x] Phase 1 — auth, targets, domain ownership verification (A1)
  - [x] Email sign-in link + Google sign-in, `/auth`, protected `/app`
  - [x] `profiles`, `apps`, `verification_attempts` with own-rows-only access
  - [x] Verification by DNS TXT, meta tag or file — server-side only, SSRF guarded, 10 attempts/app/hour
  - [x] Dashboard: add app, copyable instructions, Mint/Amber/Coral status, Run check disabled (Phase 2)
  - [x] Tests: pass + fail per method, cross-account isolation, localhost & 169.254.169.254 rejected
- [x] Phase 2 — scan jobs, findings schema, signed worker API, worker starter repo
  - [x] `scans`, `findings`, `scan_events` tables, own-rows-only access, one active check per app
  - [x] Signed worker endpoints: claim / progress / result (HMAC + 5-min window, verified 200 / 401 / 401)
  - [x] Dashboard: Run check enabled for verified apps, live progress, cancel while queued
  - [x] `worker/` starter repo: Node 20 + Playwright, checks with evidence, systemd unit, README
  - [ ] Run the worker on Lightsail and complete one real end-to-end check (needs the server)
- [ ] Phase 3 — report UI with evidence, re-scan diff
  - [x] `/report/:id` page: live status, bug/review/passed counts, each finding with its evidence
  - [x] Re-scan comparison on the report (fixed / new / changed vs the previous finished check)
- [ ] Phase 4 — payments + webhook verification
- [ ] Phase 5 — support + status page

## Blocked / needs user

- Payment provider account approval (Dodo or Stripe)
- Legal text for Terms / Privacy (lawyer review)
- Lightsail worker server sizing + SSH access (needed at Phase 2)
