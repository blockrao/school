/**
 * Increment 10R — a single place to turn a stored "website"/"source" value
 * into a safe, absolute external link. Surfaced by the Increment 10 audit
 * (28 Sep 2026): `schools.website` is free-text entered by data ops/import,
 * and 1,986 of 2,255 published schools with a website on file (88%, checked
 * against live production) have no `http(s)://` scheme — e.g. "www.vgschool.in".
 * Used raw as `href`, a value like that resolves as a *relative* path off the
 * current page (`https://schooloye.com/school/www.vgschool.in`), not the
 * external site — and used raw in JSON-LD `sameAs`, it isn't a valid absolute
 * URI. Every call site that turns a stored value into an external `href` or
 * a JSON-LD URL property must go through this first.
 *
 * Deliberately conservative: only adds a scheme when one is plausibly
 * missing. Never rewrites a value that already looks like a URL (with a
 * scheme), and never invents `https://` for something that isn't shaped like
 * a domain — an empty string, a bare word, or javascript:/mailto:/etc (mailto:
 * and tel: links are already scheme-correct constructed with template
 * literals elsewhere and never need this).
 */
export function normalizeExternalUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  // Already has a scheme (http:, https:, or any other RFC 3986 scheme like
  // mailto:/tel: someone stored here by mistake) — leave it exactly as-is.
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;

  // Protocol-relative ("//example.com") — valid as an href, leave as-is.
  if (trimmed.startsWith("//")) return trimmed;

  // Looks like a bare domain (has at least one dot, no spaces, no leading
  // slash) — the common case ("www.vgschool.in", "vgschool.in"). Prepend
  // https:, never http: (every school site reachable at all today is
  // reachable over https; forcing https avoids mixed-content warnings).
  if (/^[^\s/]+\.[^\s/]+/.test(trimmed)) return `https://${trimmed}`;

  // Doesn't look like a domain at all (e.g. a bare word, a local path) —
  // don't guess; return null rather than link to something wrong.
  return null;
}
