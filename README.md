# Callsheet

Scheduling app for student/indie film crews: magic-link auth, half-day availability input, auto-suggested shoot dates, email + `.ics` invites with Accept/Decline, and a live RSVP dashboard.

Build tracking lives in GitHub Issues — see [#23](https://github.com/RVLT-Labs/CallSheet/issues/23) for the full roadmap and dependency-ordered build sequence.

## Stack

- **Next.js 16** (App Router, Turbopack)
- **Postgres + Prisma 7** (new `prisma-client` generator + `@prisma/adapter-pg` driver adapter — see `prisma/schema.prisma`)
- **Better Auth** — magic-link plugin (passwordless) + organization plugin (Film = Organization, crew = Member)
- **Resend** — transactional email, will also carry `.ics` calendar attachments (issue #10)

## Local setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Copy the env template and fill in real values:

   ```bash
   cp .env.example .env
   # generate a secret: openssl rand -base64 32
   ```

3. Start Postgres locally:

   ```bash
   docker compose up -d
   ```

   (Or point `DATABASE_URL` at any Postgres instance you already have running.)

4. Apply migrations and generate the Prisma client:

   ```bash
   pnpm db:migrate
   ```

5. Run the dev server:

   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Script | What it does |
|---|---|
| `pnpm dev` | Start the dev server |
| `pnpm build` | Production build |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm db:migrate` | Create/apply a dev migration (`prisma migrate dev`) |
| `pnpm db:deploy` | Apply existing migrations without prompting (CI/prod) |
| `pnpm db:studio` | Prisma Studio |

## Auth notes

- Sign-in is magic-link only, no passwords. The route handler lives at `src/app/api/auth/[...all]/route.ts`; config is in `src/lib/auth.ts` (server) and `src/lib/auth-client.ts` (client).
- A Film is a Better Auth Organization; crew membership is a Member row. Organiser = org owner/admin, crew = org member — this maps directly onto Better Auth's default roles, no custom access-control needed.
- Film-specific fields (working date range, poster, status, the 3 privacy toggles) are `additionalFields` on the organization schema, not a separate `Film` table — see spec §4.1 and §6.
- Without a real `RESEND_API_KEY`, email sends fail at request time with an auth error from Resend's API — everything else (session/token creation, Prisma writes) still works, which is enough to develop against locally.

## Design reference

The product spec, design system, and every screen mockup this app is built from live outside this repo in the delivered design package (`filmshoot-scheduler-spec.md`, `callsheet-design-system.md`, `SCREENS.md`/`screens.json`, `screens/*.html`). Check the linked GitHub issue for the relevant spec section and screen file before implementing any UI.
