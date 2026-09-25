# Deploy

## Required environment variables

The app never uses the Supabase service-role/secret key (see CLAUDE.md's Trust rules).
Only these three are needed to build and run:

| Variable | Where | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel + `.env.local` | Public, safe to expose |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Vercel + `.env.local` | Public, RLS-scoped — safe to expose |
| `REVALIDATE_SECRET` | Vercel + `.env.local` | Server-only; checked against the `x-revalidate-secret` header on `/api/revalidate` |

Terminal-only tasks (scripts under `scripts/`) additionally use `DATABASE_URL` /
`DATABASE_URL_RO` from `.env.local` — never exposed to the app or the client bundle.

## Region
Database: Supabase ap-southeast-1 (Singapore). Vercel functions: `sin1` (see `vercel.json`).
