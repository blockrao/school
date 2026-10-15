import type { PublicSchoolFee } from "@/contracts";
import { FEE_BASIS_LABEL, FEE_FREQUENCY_LABEL, FEE_HEAD_LABEL, factLabel } from "@/lib/fact-label";
import { formatCurrency } from "@/lib/format";

/**
 * Fees block (school page block 5). Itemised per class, with the basis and the
 * provenance of every figure. Renders an honest empty state when there are no
 * published rows; it never estimates a number. Only rows that passed review
 * reach this component (api.public_school_fees).
 */

function classLabel(code: string | null): string {
  if (!code) return "All classes";
  const c = code.replace(/^c/, "");
  return /^\d+$/.test(c) ? `Class ${c}` : c.charAt(0).toUpperCase() + c.slice(1);
}

function amountText(f: PublicSchoolFee): string {
  if (f.amount_min == null && f.amount_max == null) return "Not reported";
  if (f.amount_min != null && f.amount_max != null && f.amount_min !== f.amount_max) {
    return `${formatCurrency(f.amount_min)} – ${formatCurrency(f.amount_max)}`;
  }
  return formatCurrency((f.amount_min ?? f.amount_max) as number);
}

/** Sum of single-value mandatory rows, only when every mandatory row has a number. */
export function firstYearTotal(rows: PublicSchoolFee[]): number | null {
  const mandatory = rows.filter((r) => r.mandatory === true);
  if (mandatory.length === 0) return null;
  let total = 0;
  for (const r of mandatory) {
    if (r.amount_min == null || r.amount_min !== (r.amount_max ?? r.amount_min)) return null;
    const perYear =
      r.frequency === "monthly"
        ? 12
        : r.frequency === "quarterly"
          ? 4
          : r.frequency === "half_yearly"
            ? 2
            : 1;
    total += r.amount_min * perYear;
  }
  return total;
}

export function FeesBlock({ fees, schoolName }: { fees: PublicSchoolFee[]; schoolName: string }) {
  if (fees.length === 0) {
    return (
      <section id="fees" aria-labelledby="fees-heading" className="flex flex-col gap-2">
        <h2 id="fees-heading" className="font-display text-card font-semibold">
          Fees
        </h2>
        <p className="rounded-md border border-dashed border-rule p-3 text-body text-muted-ink">
          Not reported. {schoolName} has not published its fee structure with us yet. Ask the school
          for the current fee circular before you pay anything.
        </p>
      </section>
    );
  }

  const year = fees[0]?.academic_year ?? "";
  const thisYear = fees.filter((f) => f.academic_year === year);
  const classes = Array.from(new Set(thisYear.map((f) => f.class_code ?? ""))).sort();

  return (
    <section id="fees" aria-labelledby="fees-heading" className="flex flex-col gap-3">
      <h2 id="fees-heading" className="font-display text-card font-semibold">
        Fees {year}
      </h2>
      {classes.map((cls) => {
        const rows = thisYear.filter((f) => (f.class_code ?? "") === cls);
        const total = firstYearTotal(rows);
        const first = rows[0];
        const label = first
          ? factLabel(
              first.source_kind,
              Boolean(first.evidence_url),
              first.observed_at ?? first.updated_at,
            )
          : null;
        const basis = first?.basis ? FEE_BASIS_LABEL[first.basis] : null;
        return (
          <div key={cls || "all"} className="flex flex-col gap-2">
            <h3 className="text-body font-semibold">{classLabel(cls || null)}</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] border-collapse text-body">
                <thead>
                  <tr className="text-left text-meta text-muted-ink">
                    <th scope="col" className="border-b border-rule py-2 pr-3 font-medium">
                      Fee
                    </th>
                    <th scope="col" className="border-b border-rule py-2 pr-3 font-medium">
                      When
                    </th>
                    <th scope="col" className="border-b border-rule py-2 pr-3 font-medium">
                      Refundable
                    </th>
                    <th scope="col" className="border-b border-rule py-2 text-right font-medium">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((f) => (
                    <tr key={f.fee_id}>
                      <td className="border-b border-rule py-2 pr-3">
                        {(f.fee_head && FEE_HEAD_LABEL[f.fee_head]) || f.component}
                        {f.variant ? <span className="text-muted-ink"> · {f.variant}</span> : null}
                        {f.mandatory === false ? (
                          <span className="text-muted-ink"> · optional</span>
                        ) : null}
                      </td>
                      <td className="border-b border-rule py-2 pr-3 text-muted-ink">
                        {f.frequency
                          ? (FEE_FREQUENCY_LABEL[f.frequency] ?? f.frequency)
                          : "Not reported"}
                      </td>
                      <td className="border-b border-rule py-2 pr-3 text-muted-ink">
                        {f.refundable == null ? "Not reported" : f.refundable ? "Yes" : "No"}
                      </td>
                      <td className="border-b border-rule py-2 text-right font-semibold">
                        {amountText(f)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {total != null && (
              <p className="text-body">
                <span className="text-muted-ink">First-year total of mandatory fees: </span>
                <span className="font-semibold">{formatCurrency(total)}</span>
              </p>
            )}
            {label && (
              <p className="text-meta text-muted-ink">
                {basis ? `Basis: ${basis}. ` : ""}
                {label.text}.
              </p>
            )}
          </div>
        );
      })}
      <p className="text-meta text-muted-ink">
        Fees change. Confirm the current amount with the school before paying.
      </p>
    </section>
  );
}
