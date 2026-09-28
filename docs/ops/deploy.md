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

Set `NEXT_PUBLIC_SITE_URL=https://schooloye.com` (the apex, D-121 §11) in Vercel, **Production
environment only** — do not set it for Preview. Every absolute URL the app emits
(canonical/hreflang via `metadataBase`, JSON-LD `url`/`item`, the sitemap index +
child sitemap `<loc>`s, the `robots.txt` `Sitemap:` line, the email magic-link
redirect) is built from `src/lib/env.server.ts`'s `siteUrl`, which uses this var
when set. Left unset, `siteUrl` falls back to Vercel's own `VERCEL_PROJECT_PRODUCTION_URL`
(sitemap/canonical/JSON-LD) or the current request's own host (the magic-link
redirect only, so Preview sign-in still round-trips to the same preview
deployment) — so Preview and local dev both work correctly without it.

**apex ↔ www is owned only by Vercel** (Project → Settings → Domains): `schooloye.com`
is the primary domain and `www.schooloye.com` is set to redirect (308) to it. The app
does **not** redirect between apex and www — on 28 Sep 2026 having both layers do it
caused a redirect loop when they disagreed. `NEXT_PUBLIC_SITE_URL` must name the same
host Vercel treats as primary. `next.config.ts` only 308s the production `*.vercel.app`
alias (`school-ten-ivory.vercel.app`) to the canonical host.

## Search indexing

Production is always open to search engines and AI crawlers (D-120). The old
`SITE_INDEXABLE` switch is removed; the Vercel env var can be deleted. Only Vercel
Preview deployments (`VERCEL_ENV=preview`) send `X-Robots-Tag: noindex, nofollow` and
a `disallow: /` robots.txt, so preview copies never compete with schooloye.com.

## Region
Database: Supabase `ap-south-1` (Mumbai). Vercel functions: `bom1` (see `vercel.json`). Keep the two in sync (D-083).
