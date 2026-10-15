/**
 * Provenance label for a published fact (owner rule, 15 Oct 2026: SchoolOye
 * publishes what school admins provide, so every fact shows who supplied it
 * and as of when). The label states only what the row itself records.
 */
export type FactSourceKind =
  | "school_admin"
  | "school_document"
  | "public_record"
  | "ops_entered"
  | "compiled";

export type FactTone = "school" | "record" | "compiled";

export type FactLabel = { text: string; tone: FactTone };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "12 Oct 2026" from an ISO date or timestamp, or null if unusable. */
export function formatFactDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function factLabel(
  sourceKind: string,
  hasEvidence: boolean,
  asOf: string | null | undefined,
): FactLabel {
  const date = formatFactDate(asOf);
  const suffix = date ? `, ${date}` : "";
  switch (sourceKind) {
    case "school_document":
      return { text: `Provided by the school, from its document${suffix}`, tone: "school" };
    case "school_admin":
      return {
        text: hasEvidence
          ? `Provided by the school, with a document${suffix}`
          : `Provided by the school${suffix}`,
        tone: "school",
      };
    case "public_record":
      return { text: `From a public record${suffix}`, tone: "record" };
    case "ops_entered":
      return { text: `Entered by SchoolOye from a school source${suffix}`, tone: "record" };
    default:
      return { text: `Compiled by SchoolOye, not verified${suffix}`, tone: "compiled" };
  }
}

export const FEE_BASIS_LABEL: Record<string, string> = {
  fee_circular: "School fee circular",
  prospectus: "School prospectus",
  school_website: "School website",
  school_confirmed: "Confirmed by the school",
  public_record: "Public record",
  estimate: "Estimate",
};

export const FEE_HEAD_LABEL: Record<string, string> = {
  registration: "Registration",
  admission: "Admission",
  security_deposit: "Security deposit",
  tuition: "Tuition",
  annual_charges: "Annual charges",
  development: "Development",
  transport: "Transport",
  meals: "Meals",
  uniform: "Uniform",
  books: "Books",
  activity: "Activities",
  other: "Other",
};

export const FEE_FREQUENCY_LABEL: Record<string, string> = {
  one_time: "One-time",
  monthly: "Per month",
  quarterly: "Per quarter",
  half_yearly: "Per half-year",
  yearly: "Yearly",
  annual: "Yearly",
};
