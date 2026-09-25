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

## Launch-day switch: `SITE_INDEXABLE`

Optional server env var, defaults to unset (treated as `false`, fails safe). While unset
or not exactly `"true"`:
- Every response gets `X-Robots-Tag: noindex, nofollow` (set in `next.config.ts`'s
  `headers()`, so it covers API routes and error pages too, not just pages `robots.ts`
  can reach).
- `robots.ts` serves `disallow: /` for all user agents — nothing is crawlable.

Set `SITE_INDEXABLE=true` in Vercel when the site is ready to go public. Do this
deliberately, on launch day — not as part of a routine deploy.

## Region
Database: Supabase ap-southeast-1 (Singapore). Vercel functions: `sin1` (see `vercel.json`).
