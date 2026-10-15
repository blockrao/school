/**
 * Feature flags. Public (NEXT_PUBLIC_*) so client components and the sitemap
 * agree with the server pages that gate on them.
 *
 * ADMISSIONS_HELP_ENABLED — the paid "Get help applying" flow
 * (/admissions/help, packages, checkout). Off by default: checkout is still
 * a mock/manual provider, so publicly selling it before real payments would
 * be a trust problem. Set NEXT_PUBLIC_ADMISSIONS_HELP_ENABLED=true to re-open.
 */
export const ADMISSIONS_HELP_ENABLED = process.env.NEXT_PUBLIC_ADMISSIONS_HELP_ENABLED === "true";
