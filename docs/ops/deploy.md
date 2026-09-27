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

## Canonical domain: `NEXT_PUBLIC_SITE_URL`

Set `NEXT_PUBLIC_SITE_URL=https://www.schooloye.com` in Vercel, **Production
environment only** — do not set it for Preview. Every absolute URL the app emits
(canonical/hreflang via `metadataBase`, JSON-LD `url`/`item`, the sitemap index +
child sitemap `<loc>`s, the `robots.txt` `Sitemap:` line, the email magic-link
redirect) is built from `src/lib/env.server.ts`'s `siteUrl`, which uses this var
when set. Left unset, `siteUrl` falls back to Vercel's own `VERCEL_PROJECT_PRODUCTION_URL`
(sitemap/canonical/JSON-LD) or the current request's own host (the magic-link
redirect only, so Preview sign-in still round-trips to the same preview
deployment) — so Preview and local dev both work correctly without it.

`next.config.ts`'s `redirects()` sends the apex domain (`schooloye.com`) and the
production `*.vercel.app` alias (`school-ten-ivory.vercel.app`) to
`https://www.schooloye.com` with a 308, matched by `Host` header — Preview
deployment URLs don't match either host, so they're unaffected.

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
Database: Supabase `ap-south-1` (Mumbai). Vercel functions: `bom1` (see `vercel.json`). Keep the two in sync (D-083).
