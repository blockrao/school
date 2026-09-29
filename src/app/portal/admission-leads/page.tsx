import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/ui/state-message";
import { getMySchoolId, listAdmissionLeadsForSchool } from "@/lib/db/portal";
import { markLeadClosed, markLeadContacted } from "./actions";

export const metadata: Metadata = {
  title: "Admission leads — SchoolOye portal",
  robots: { index: false, follow: false },
};

const STATUS_LABEL: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  closed: "Closed",
};

const STATUS_CLASS: Record<string, string> = {
  new: "border-pill-open-bd bg-pill-open-bg text-pill-open-fg",
  contacted: "border-line-blue bg-copy-white text-ruled-blue",
  closed: "border-sponsored-border text-muted-ink",
};

export default async function AdmissionLeadsPage() {
  const schoolId = await getMySchoolId();
  if (!schoolId) redirect("/for-schools");

  const leads = await listAdmissionLeadsForSchool(schoolId);

  return (
    <div className="mx-auto max-w-(--container-page) px-4 py-6 md:px-10 md:py-9">
      <div>
        <Link href="/portal" className="text-meta font-semibold text-ruled-blue">
          ← Dashboard
        </Link>
        <h1 className="mt-1 font-display text-title-m md:text-title-d">Admission leads</h1>
        <p className="mt-1 text-body text-muted-ink">
          Parents who applied for a class through your SchoolOye page. Their name and phone are
          shared here because they consented to it when applying — reach out directly to move the
          application forward.
        </p>
      </div>

      {leads.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No applications yet"
            description="Applications parents submit for your open classes will show up here."
            nextStepLabel="Manage your admission cycles"
            nextStepHref="/portal/edit-request"
          />
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {leads.map((lead) => (
            <div key={lead.id} className="rounded-md border border-rule bg-copy-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="text-meta font-semibold text-muted-ink">
                    {lead.academic_year} · Class {lead.class_code.replace(/^c/, "")}
                  </span>
                  <h2 className="font-display text-card font-semibold">
                    {lead.full_name ?? "Parent"}
                  </h2>
                  {lead.phone && (
                    <a
                      href={`tel:${lead.phone}`}
                      className="text-body font-semibold text-ruled-blue"
                    >
                      {lead.phone}
                    </a>
                  )}
                  {lead.note && (
                    <p className="mt-1 max-w-xl whitespace-pre-wrap text-body">{lead.note}</p>
                  )}
                  <p className="mt-1 text-meta text-muted-ink">
                    Applied{" "}
                    {new Date(lead.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-meta font-semibold ${
                    STATUS_CLASS[lead.status] ?? ""
                  }`}
                >
                  {STATUS_LABEL[lead.status] ?? lead.status}
                </span>
              </div>

              {lead.status !== "closed" && (
                <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-rule pt-3">
                  {lead.status === "new" && (
                    <form action={markLeadContacted}>
                      <input type="hidden" name="leadId" value={lead.id} />
                      <button
                        type="submit"
                        className="text-meta font-semibold text-ruled-blue underline"
                      >
                        Mark contacted
                      </button>
                    </form>
                  )}
                  <form action={markLeadClosed}>
                    <input type="hidden" name="leadId" value={lead.id} />
                    <button type="submit" className="text-meta text-muted-ink underline">
                      Close
                    </button>
                  </form>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
