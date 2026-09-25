/** "admissions@greenvalley.edu.in" -> "ad••••••••@greenvalley.edu.in" */
export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain) return email;
  const visible = user.slice(0, 2);
  return `${visible}${"•".repeat(Math.max(3, user.length - 2))}@${domain}`;
}

/** "+919876543210" -> "+91 98••• •••10" (keeps country code, first 2 and last 2 digits) */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 6) return phone;
  const last2 = digits.slice(-2);
  const rest = digits.slice(0, -2);
  const countryCode = rest.length > 10 ? rest.slice(0, rest.length - 10) : "91";
  const local = rest.length > 10 ? rest.slice(rest.length - 10) : rest;
  const localMasked = `${local.slice(0, 2)}${"•".repeat(Math.max(0, local.length - 2))}`;
  return `+${countryCode} ${localMasked}${last2}`;
}
