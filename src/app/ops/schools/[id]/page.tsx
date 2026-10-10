import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { WordCountedTextarea } from "@/components/ui/word-counted-textarea";
import { requireStaff } from "@/lib/db/ops";
import { updateSchool } from "./actions";

export const metadata: Metadata = {
  title: "School detail — SchoolOye ops",
  robots: { index: false, follow: false },
};

const MANAGEMENT_OPTIONS = [
  "private_unaided",
  "private_aided",
  "government",
  "central_government",
  "local_body",
  "other",
];
const GENDER_OPTIONS = ["coed", "boys", "girls"];
const TIER_OPTIONS = ["A", "B", "C"];
const STATUS_OPTIONS = ["draft", "published", "hidden", "closed", "opt_out"];
const VERIFICATION_OPTIONS = ["unverified", "source_verified", "ops_verified", "school_verified"];
const CLAIM_OPTIONS = ["unclaimed", "pending", "claimed", "rejected"];

function fieldClass() {
  return "h-10 w-full rounded-md border border-line-blue-strong bg-copy-white px-2 text-meta outline-none";
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-1 border-0 p-0 m-0">
      <legend className="text-meta font-semibold text-muted-ink">{label}</legend>
      {children}
    </fieldset>
  );
}

export default async function OpsSchoolDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { supabase } = await requireStaff();
  const { id } = await params;

  const [{ data: school }, { data: affiliation }, { data: identifiers }] = await Promise.all([
    supabase.from("schools").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("school_affiliations")
      .select("affiliation_no, level, valid_from, valid_to, boards(name_en)")
      .eq("school_id", id)
      .maybeSingle(),
    supabase.from("school_identifiers").select("scheme, value").eq("school_id", id),
  ]);

  if (!school) notFound();

  return (
    <div className="mx-auto max-w-(--container-read) px-4 py-6 md:px-10 md:py-9">
      <Link href="/ops/schools" className="text-meta text-ruled-blue">
        ← Back to schools
      </Link>
      <h1 className="mt-2 font-display text-title-m md:text-title-d">
        {school.name_en ?? "Name not yet published"}
      </h1>
      <p className="mt-1 text-meta text-muted-ink">
        Code {school.school_code} · Slug {school.slug} · Completeness {school.completeness}% ·
        Created {new Date(school.created_at).toLocaleDateString("en-IN")}
      </p>

      <div className="mt-4 rounded-md border border-rule bg-copy-white p-4 text-meta text-muted-ink">
        <p className="font-semibold text-ink">Reference (read-only)</p>
        <p className="mt-1">
          {affiliation
            ? `${(affiliation.boards as unknown as { name_en: string } | null)?.name_en ?? "Board"} · affiliation ${affiliation.affiliation_no ?? "—"}${affiliation.level ? ` · ${affiliation.level}` : ""}`
            : "No board affiliation on file"}
        </p>
        <p className="mt-1">
          {identifiers && identifiers.length > 0
            ? identifiers.map((i) => `${i.scheme}: ${i.value}`).join(" · ")
            : "No identifiers on file"}
        </p>
        <p className="mt-1">
          Source attribution: <span className="font-semibold text-ink">{school.source_type ?? "unknown"}</span>
          {" · "}Verification: <span className="font-semibold text-ink">{school.verification}</span>
          {" · "}Verification status: <span className="font-semibold text-ink">{school.verification_status}</span>
        </p>
        {/* Enrichment provenance (moved here from the public entity page, 30 Sep
          2026 — per-field confidence scores and source acronyms like "UDISE"
          are actionable for staff deciding whether to trust/re-check a field,
          but meant nothing to a parent reading the public page). */}
        {(school.enriched_at || (school.enrichment_sources?.length ?? 0) > 0) && (
          <div className="mt-2 border-t border-rule pt-2">
            <p>
              Enrichment: {school.enrichment_sources?.join(", ") || "unknown source"}
              {school.enriched_at &&
                ` · last changed ${new Date(school.enriched_at).toLocaleDateString("en-IN")}`}
            </p>
            {school.data_quality_flags &&
              Object.keys(school.data_quality_flags as Record<string, number | null>).length >
                0 && (
                <p className="mt-1">
                  Confidence:{" "}
                  {Object.entries(school.data_quality_flags as Record<string, number | null>)
                    .filter(([, v]) => typeof v === "number")
                    .map(([field, score]) => `${field} ${Math.round((score as number) * 100)}%`)
                    .join(" · ")}
                </p>
              )}
          </div>
        )}
      </div>

      <form action={updateSchool} className="mt-6 flex flex-col gap-6">
        <input type="hidden" name="id" value={school.id} />

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Name (English)">
            <input
              type="text"
              name="name_en"
              defaultValue={school.name_en ?? ""}
              required
              className={fieldClass()}
            />
          </Field>
          <Field label="Name (Hindi)">
            <input
              type="text"
              name="name_hi"
              defaultValue={school.name_hi ?? ""}
              className={fieldClass()}
            />
          </Field>
          <Field label="Management">
            <select
              name="management"
              defaultValue={school.management ?? ""}
              className={fieldClass()}
            >
              <option value="">Not yet published</option>
              {MANAGEMENT_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Gender">
            <select name="gender" defaultValue={school.gender ?? ""} className={fieldClass()}>
              <option value="">Not yet published</option>
              {GENDER_OPTIONS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Medium (comma-separated)">
            <input
              type="text"
              name="medium"
              defaultValue={(school.medium ?? []).join(", ")}
              placeholder="English, Hindi"
              className={fieldClass()}
            />
          </Field>
          <Field label="Established year">
            <input
              type="number"
              name="established_year"
              defaultValue={school.established_year ?? ""}
              className={fieldClass()}
            />
          </Field>
          <Field label="Min class">
            <input
              type="text"
              name="min_class"
              defaultValue={school.min_class ?? ""}
              placeholder="e.g. nursery"
              className={fieldClass()}
            />
          </Field>
          <Field label="Max class">
            <input
              type="text"
              name="max_class"
              defaultValue={school.max_class ?? ""}
              placeholder="e.g. c12"
              className={fieldClass()}
            />
          </Field>
          <Field label="Tier">
            <select name="tier" defaultValue={school.tier} className={fieldClass()}>
              {TIER_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
        </section>

        <section className="grid grid-cols-1 gap-4">
          <Field label="Address">
            <input
              type="text"
              name="address"
              defaultValue={school.address ?? ""}
              className={fieldClass()}
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Pincode">
              <input
                type="text"
                name="pincode"
                defaultValue={school.pincode ?? ""}
                className={fieldClass()}
              />
            </Field>
            <Field label="Website">
              <input
                type="text"
                name="website"
                defaultValue={school.website ?? ""}
                className={fieldClass()}
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Phone (comma-separated)">
              <input
                type="text"
                name="phone"
                defaultValue={(school.phone ?? []).join(", ")}
                className={fieldClass()}
              />
            </Field>
            <Field label="Email (comma-separated)">
              <input
                type="text"
                name="email"
                defaultValue={(school.email ?? []).join(", ")}
                className={fieldClass()}
              />
            </Field>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4">
          <Field label="About (English)">
            <WordCountedTextarea
              name="about_en"
              defaultValue={school.about_en ?? ""}
              rows={3}
              hint='About this school: up to 80 words. Use factual, school-specific information only. Avoid promotional claims such as "best", "premier", "top", or "leading".'
              wordLimit={80}
              className="w-full rounded-md border border-line-blue-strong bg-copy-white p-2 text-meta outline-none"
            />
          </Field>
          <Field label="About (Hindi)">
            <textarea
              name="about_hi"
              defaultValue={school.about_hi ?? ""}
              rows={3}
              className="w-full rounded-md border border-line-blue-strong bg-copy-white p-2 text-meta outline-none"
            />
          </Field>
        </section>

        <section className="rounded-md border border-rule bg-margin-paper p-4">
          <p className="font-display text-card font-semibold">Publish controls</p>
          <p className="mt-1 text-meta text-muted-ink">
            Only change these once an agent has actually confirmed the facts above — by phone or a
            live source. Publishing makes this school visible on the public site.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Status">
              <select name="status" defaultValue={school.status} className={fieldClass()}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Verification">
              <select
                name="verification"
                defaultValue={school.verification}
                className={fieldClass()}
              >
                {VERIFICATION_OPTIONS.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Claim">
              <select name="claim" defaultValue={school.claim} className={fieldClass()}>
                {CLAIM_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <label className="mt-3 flex items-center gap-2 text-meta text-ink">
            <input type="checkbox" name="markVerifiedNow" value="1" />
            Record this as verified right now (sets last verified date to today)
          </label>
          {school.last_verified_at ? (
            <p className="mt-1 text-meta text-muted-ink">
              Last verified {new Date(school.last_verified_at).toLocaleDateString("en-IN")}
            </p>
          ) : null}
        </section>

        <button
          type="submit"
          className="flex h-11 w-fit items-center rounded-md bg-ruled-blue px-5 font-semibold text-copy-white"
        >
          Save changes
        </button>
      </form>
    </div>
  );
}
