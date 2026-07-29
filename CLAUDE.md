@AGENTS.md

# Callsheet — project guide

Scheduling app for student/indie film crews. Full product spec, design system, and every screen mockup live outside this repo in the delivered design package (`filmshoot-scheduler-spec.md`, `callsheet-design-system.md`, `SCREENS.md`/`screens.json`, `screens/*.html`) — read the relevant spec section and mockup file before implementing anything UI- or logic-facing. The build is tracked entirely in GitHub Issues, rooted at **[#23](https://github.com/RVLT-Labs/CallSheet/issues/23)**, which has the dependency-ordered build sequence for every issue.

## Workflow: every issue is a branch, every branch is a PR, every PR merges to `main`

`main` is always deployable. Nothing lands on it except through a reviewed, green PR.

1. **Pick an issue.** Check #23 for the next unblocked item, or work whatever the user assigned. Read its Dependencies section — don't start an issue whose dependencies aren't merged yet.
2. **Branch from latest `main`:** `git fetch origin main && git checkout -b issue-<number>-<kebab-slug> origin/main` — e.g. `issue-6-availability-input`. Never commit directly to `main`.
3. **Build it.** If an issue is large enough that it doesn't fit in one reviewable PR, split it into multiple sequential PRs against the same issue rather than opening one giant PR — each intermediate PR body says `Part of #<n>`, the final one says `Closes #<n>`.
4. **Before opening the PR**, verify locally: `pnpm lint`, `pnpm typecheck`, `pnpm build` all pass, and any new Prisma schema change has a committed migration (`pnpm db:migrate`) that applies cleanly to a fresh database. For UI, actually run it and check it against the linked mockup file — "should work" is not verification.
5. **Open the PR** using the repo's PR template. Reference the issue (`Closes #<n>` / `Part of #<n>`), link the exact spec section(s) and design file(s) it implements, and state what you verified and how.
6. **CI must be green** (lint, typecheck, build — see `.github/workflows/ci.yml`) before merge.
7. **Squash-merge** into `main`, delete the branch. Update the issue's acceptance-criteria checkboxes and close it (GitHub auto-closes on `Closes #<n>` merge — double check it actually did).

Repo admin should turn on branch protection on `main` (require the CI check, require a PR, block direct pushes) — that's a repo-settings change outside what these tools can configure, do it once by hand in GitHub settings.

## Branch & commit conventions

- Branch name: `issue-<number>-<kebab-slug>`, always cut from current `main`.
- Commits: imperative mood ("Add availability calendar", not "Added" or "Adding"). Explain *why* in the body when it's non-obvious, not what — the diff already shows what.
- PR title: short, recognizably matches the issue title.
- Keep PRs scoped to one issue or one clear slice of one issue. A small, reviewable diff beats one PR that touches five epics at once.

## Codebase practices

**DRY, but not preemptively.** If you're about to write a third near-identical block, extract it. Don't build an abstraction for a hypothetical second use case that doesn't exist yet — three similar lines beats a premature generic helper with one caller.

**Modularity / where things live:**
- `src/app/` — routes only. Pages and route handlers stay thin; they call into `src/server/` or `src/lib/`, they don't contain business logic themselves.
- `src/lib/` — cross-cutting infrastructure: `auth.ts`/`auth-client.ts` (Better Auth), `prisma.ts` (DB client), `email.ts` (Resend). Framework/service wiring, not domain logic.
- `src/server/` — domain logic as plain, testable functions: availability precedence resolution, the shoot-suggestion ranking algorithm, RSVP state transitions, `.ics`/token generation. These should be callable and testable without spinning up a route or a browser.
- `src/components/` — the design system (issue #2) and everything built on it. Feature screens compose these; they don't re-implement a button, tier-picker, status dot, or bottom-sheet/modal from scratch. If a screen needs a UI pattern that isn't in the component library yet, add it there first, don't one-off it inline.
- `prisma/schema.prisma` — the single source of truth for the data model. Every change ships with a migration in the same PR; never hand-edit the DB or let schema drift from what's committed.

**General:**
- TypeScript strict mode stays on. No `any` without a comment explaining why it's actually unavoidable.
- No secrets in code or commits. Everything through env vars; keep `.env.example` in sync whenever a PR introduces a new required var.
- Match the design system (`callsheet-design-system.md`) for every screen — component choice, spacing/color tokens, and voice/tone rules (no em dashes, no generic AI-assistant phrasing, ever, in product copy). Check `SCREENS.md`/`screens.json` for the canonical mockup before inventing a layout.
- State non-obvious business rules in code comments where they'd otherwise be invisible (e.g. manual-overrides-recurring precedence, tentative-vs-confirmed being genuinely different content) — these are easy to silently regress.
- Don't add speculative features, config flags, or abstraction layers beyond what the current issue asks for.

## Verification expectations

- Every PR: `pnpm lint`, `pnpm typecheck`, `pnpm build` clean (CI enforces this, but check locally first).
- Business logic (suggestion algorithm, availability precedence, RSVP transitions, `.ics` UID/SEQUENCE handling): add unit tests alongside the implementation, not after.
- UI: actually run it and exercise the golden path plus the edge cases the issue calls out (empty states, long lists, tentative vs confirmed, etc.) before calling it done.
- Schema changes: apply the migration to a real (or freshly-created local) Postgres, don't just eyeball the generated SQL.

## Where to look things up

- Product spec: `filmshoot-scheduler-spec.md` (features, data model, business logic, tech decisions)
- Design system + tokens: `callsheet-design-system.md`, `callsheet-component-library.html`
- Screen-to-mockup index: `SCREENS.md` (human-readable) / `screens.json` (machine-readable) — canonical vs superseded vs deprecated
- Roadmap, dependency order, and per-issue "depends on / blocks": GitHub issue [#23](https://github.com/RVLT-Labs/CallSheet/issues/23) and the 22 linked epics
- Local setup, scripts, stack notes: `README.md`
- Next.js 16 breaking-changes warning: `AGENTS.md` (imported at the top of this file)
