const INDIA_MOBILE_RE = /^[6-9]\d{9}$/;

/** Normalizes an Indian mobile number (with or without +91/91 prefix, spaces, dashes) to E.164. Returns null if invalid. */
export function normalizeIndianPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  const local = digits.startsWith("91") && digits.length === 12 ? digits.slice(2) : digits;
  return INDIA_MOBILE_RE.test(local) ? `+91${local}` : null;
}

/** +91XXXXXXXXXX -> "+91 XXXXX XXXXX", for display only. */
export function formatIndianPhone(e164: string): string {
  const local = e164.replace("+91", "");
  return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
}
