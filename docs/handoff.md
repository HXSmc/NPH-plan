# Handoff — start here (next session)

> Entry point for a new Claude Code session picking up Taweed. Read this, then run the
> IMPLEMENT prompt. Written 2026-07-04.

## Where the project stands

- **CREATE phase (data pipeline) is DONE** and on `origin/main` (github.com:HXSmc/taweed).
- Proven end-to-end on synthetic data: `generate → parse → normalize → insert into Postgres with RLS`. 56 unit + 3 integration tests green.
- **Next up: IMPLEMENT phase** (the 5 MVP modules + UI). Full paste-ready prompt is in
  `docs/NEXT_STEP_PROMPT.md` (kept local/gitignored — present on the owner's device).

## Can you start now?

**Yes — no hard blockers.** Soft caveats only:

- Run `pnpm install` first (node_modules is not committed).
- `design/` (UI source assets) and `docs/NEXT_STEP_PROMPT.md` are **local-only** (gitignored) — they exist on the owner's device, NOT in a fresh clone. Start on the owner's machine, or copy them over.
- Fonts to source for the UI: **Cabinet Grotesk** (Fontshare, not Google Fonts), **Geist** (Vercel), **IBM Plex Sans Arabic** (Google). See `docs/03_design_brief.md` §4.3.
- Everything NPHIES-real (codes, IG validation, PKI, KSA-resident OIDC, KSA-region hosting) stays **stubbed/deferred** — IMPLEMENT runs on synthetic data. Not a blocker; that's the design.

## How to run (this repo)

Environment quirks (macOS, fish shell):

- **pnpm** is at `~/.local/bin/pnpm` (not global; corepack was blocked). Prefix PATH per command:
  `set -x PATH $HOME/.local/bin $PATH`.
- **RTK hook** compresses test/tsc/eslint stdout to a useless summary but runs the real command
  and preserves exit codes. Workaround: write results to a file and read it —
  `vitest run --reporter=json --outputFile <path>` then parse; `tsc ... 2><file>`.
- Env vars don't always reach RTK's re-exec'd child — use an `env VAR=val <cmd>` prefix.
- Node is **v20.2.0** (below Next 16's floor) → `apps/web` pins **Next 15**.

Commands:

```bash
cd "~/Desktop/web apps/taweed"
~/.local/bin/pnpm install
~/.local/bin/pnpm typecheck        # tsc --noEmit
~/.local/bin/pnpm lint             # eslint
~/.local/bin/pnpm test             # unit (vitest --project unit)
docker compose up -d               # local Postgres (postgres:16, creds taweed/taweed)
env DATABASE_URL=postgres://taweed:taweed@localhost:5432/taweed ~/.local/bin/pnpm test:int
docker compose down
```

## Repo map (what exists)

- `packages/shared` — canonical row types + placeholder `DENIAL_REASON_CODES` (8 fake `TWD-*`, `TODO(nphies-creds)`)
- `packages/fhir` — R4 parse + base-R4 validate (`@medplum/fhirtypes` for types only); `validateAgainstNphiesProfile()` stub
- `packages/normalizer` — FHIR pair → canonical rows, denials exploded
- `packages/db` — **Drizzle** schema, migrations, **RLS (FORCE + non-superuser `taweed_app` role)**, `withTenant`, `insertNormalizedClaim`
- `test/synthetic-fhir` — deterministic R4 bundle generator (9 scenarios)
- `packages/{rules-engine,appeals,audit}` — **stubs** (build these in IMPLEMENT)
- `apps/web` — empty Next 15 placeholder (build the real app in IMPLEMENT)
- CI: `.github/workflows/ci.yml` (lint + typecheck + unit + integration w/ Postgres service)

## Must-read before building

- `docs/NEXT_STEP_PROMPT.md` — the IMPLEMENT prompt (local only).
- `docs/superpowers/CREATE_review_followups.md` — deferred review items now due: **auth-derived `tenant_id`**, **composite same-tenant FKs**, **money precision** (local only).
- `docs/02_product_build_plan.md` §2/§7/§8 · `docs/03_design_brief.md` (UI system) · `docs/ECC_GUIDE.md` (tooling).

## Key decisions locked in CREATE

- ORM = **Drizzle** (chosen over Prisma for first-class RLS / session-var support).
- FHIR types = `@medplum/fhirtypes`; validation is **base R4 only, hand-rolled** (NPHIES profile validation is creds-gated stub).
- RLS proven via a **non-superuser `taweed_app` role** (superusers bypass RLS); migrations run as superuser.
- No build step for tests: `moduleResolution: Bundler` + workspace `exports` → `src/index.ts`.
