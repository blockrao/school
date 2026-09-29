import { z } from "zod";

/** Mirrors db/views/010_public_schools.sql — api.public_schools. */
export const publicSchoolContract = z.object({
  id: z.string(),
  /** Internal 6-digit id — never in a URL or JSON-LD (D-121). */
  school_code: z.number(),
  /** Permanent public locator: /school/{slug}. Minted once, write-once (D-121). */
  slug: z.string(),
  district_id: z.number().nullable(),
  city_id: z.number().nullable(),
  locality_id: z.number().nullable(),
  locality_slug: z.string().nullable(),
  locality_name: z.string().nullable(),
  locality_is_town: z.boolean().nullable(),
  name_en: z.string().nullable(),
  name_hi: z.string().nullable(),
  management: z.string().nullable(),
  gender: z.string().nullable(),
  medium: z.array(z.string()).nullable(),
  min_class: z.string().nullable(),
  max_class: z.string().nullable(),
  address: z.string().nullable(),
  pincode: z.string().nullable(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  geocode_precision: z.string().nullable(),
  website: z.string().nullable(),
  phone: z.array(z.string().nullable()).nullable(),
  email: z.array(z.string().nullable()).nullable(),
  established_year: z.number().nullable(),
  tier: z.string(),
  verification: z.string(),
  claim: z.string(),
  last_verified_at: z.string().nullable(),
  about_en: z.string().nullable(),
  about_hi: z.string().nullable(),
  /** 'published' or 'closed' (closed schools stay live with a banner, D-121 §9). */
  status: z.string(),
  aliases: z.array(z.string()),
  state_slug: z.string().nullable(),
  city_slug: z.string().nullable(),
  /** UDISE+ school code (Government of India) — see
   * supabase/migrations/20260929100000_school_udise_identity.sql. That
   * migration and the matching db/views/010_public_schools.sql column are
   * deliberately not applied yet (human-run `db:migrate`/`db:views --confirm`,
   * per this repo's standing process) — so `api.public_schools` doesn't emit
   * this key at all today. `.nullable()` alone only accepts an explicit
   * `null`, not a missing key, so every row failed to parse in production
   * the moment this contract shipped ahead of the view (P0, found live 29
   * Sep 2026 — homepage/`/schools` 500s, since they call publicSchoolContract
   * directly; the school entity page appeared unaffected only because a
   * stale cached page was still being served). `.optional()` makes the
   * contract match today's actual view output; once the view is applied,
   * real values start flowing through unchanged — remove `.optional()` then
   * if you want the field to be a firm guarantee again. */
  udise_code: z.string().nullable().optional(),
  /** UDISE Enrichment: Principal/Head Name (29 Sep 2026) — 100% coverage in UDISE data */
  principal_name: z.string().nullable().optional(),
  /** UDISE Enrichment: Structured address components (29 Sep 2026) */
  address_street: z.string().nullable().optional(),
  address_area: z.string().nullable().optional(),
  address_city: z.string().nullable().optional(),
  address_district: z.string().nullable().optional(),
  address_state: z.string().nullable().optional(),
  address_state_code: z.string().nullable().optional(),
  address_pincode: z.string().nullable().optional(),
  address_source: z.string().nullable().optional(),
  /** Enrichment Metadata (1 Oct 2026): when enrichment occurred and its freshness.
   * Plain `z.string()`, not `.datetime()` — PostgREST serializes `timestamptz` as
   * "2026-09-29 00:00:00+00" (space separator, "+00" offset), which fails Zod's
   * strict ISO-8601 `.datetime()` validator (it wants a literal "T" and, without
   * `{ offset: true }`, a bare "Z"). That mismatch made `publicSchoolContract.parse()`
   * throw for every row with a non-null enriched_at, taking down `/school/[slug]`
   * and `/schools` with 500s (found 30 Sep 2026, matches `last_verified_at` below
   * which was already a plain string for the same reason). */
  enriched_at: z.string().nullable().optional(),
  /** Which sources (UDISE, CBSE_SARAS, etc.) contributed to enrichment */
  enrichment_sources: z.array(z.string()).nullable().optional(),
  /** Per-field data quality scores (0.0-1.0 confidence). Example: {"principal_name": 0.95} */
  data_quality_flags: z.record(z.string(), z.number()).nullable().optional(),
});

/** Mirrors db/views/015_public_school_redirects.sql — api.public_school_redirects. */
export const publicSchoolRedirectContract = z.object({
  from_slug: z.string(),
  from_code: z.number().nullable(),
  from_id: z.string().nullable(),
  to_slug: z.string(),
  kind: z.string(),
});

export type PublicSchoolRedirect = z.infer<typeof publicSchoolRedirectContract>;

export type PublicSchool = z.infer<typeof publicSchoolContract>;
