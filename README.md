# Lettuce Boilerplate 🥬

A bare-bones starter for **Next.js + Better Auth + Supabase (Postgres) + Drizzle ORM**, deployed on **Vercel**. Uses plain `npm`.

The tools are installed but intentionally **not wired up** — no auth config, no database schema, no migrations. Build those for your own project.

## What's included

| Tool | Package(s) | Status |
| --- | --- | --- |
| Next.js (App Router, TypeScript, Tailwind, ESLint) | `next`, `react`, `react-dom` | Default starter page |
| Better Auth | `better-auth` | Installed, not configured |
| Drizzle ORM | `drizzle-orm`, `drizzle-kit` (dev) | Installed, no schema/config |
| Postgres driver for Supabase | `postgres` | Installed |
| Vercel | — | Deploys out of the box |

Also: `.env.example`, `.gitignore`, `.nvmrc`, recommended VS Code / Cursor extensions (`.vscode/extensions.json`), and a `CLAUDE.md` with project rules for Claude Code.

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in real values
npm run dev
```

Open http://localhost:3000.

## Environment variables

See `.env.example`. In short:

- `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` — for Better Auth.
- `DATABASE_URL` — Supabase **transaction pooler** (port 6543), used by the app. Use `prepare: false` with the `postgres` client.
- `DATABASE_URL_SESSION` — Supabase **session pooler** (port 5432), used only for migrations.

Never commit `.env.local`. On Vercel, add these under Project → Settings → Environment Variables.

## Next steps (not done for you)

- Better Auth: create `src/lib/auth.ts`, an auth client, and the `/api/auth/[...all]` route — see https://www.better-auth.com/docs/installation
- Drizzle: add `drizzle.config.ts`, a schema file, and a `db` client — see https://orm.drizzle.team/docs/get-started/supabase-new
- Deploy: import the repo at https://vercel.com/new
