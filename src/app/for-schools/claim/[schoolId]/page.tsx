import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FieldError } from "@/components/ui/field-error";
import { getSchoolCanonicalPath, listPublicSchoolsByIds } from "@/lib/db/public-adapter";
import { formatGradeRange } from "@/lib/grades";
import { maskEmail, maskPhone } from "@/lib/mask";
import { submitClaim } from "./actions";

// Adapted from design/School Portal.dc.html 18a/18b: the design shows an
// instant OTP sent to the masked email/phone, verified on a second screen. This
// repo has no email-OTP or SMS-to-arbitrary-address integration — only phone
// sign-in via Supabase Auth, which isn't the same thing as verifying a SCHOOL'S
// official contact. Built honestly instead: the claimant types the full
// email/phone they believe is on record, it's compared server-side against
// what's actually on file, and either way the claim goes to staff review
// (school_claims.status='pending') — staff make the real verification call, per
// "staff approves in /ops". No fake "code sent" step.

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Claim your school — SchoolOye", robots: { index: false, follow: false } };
}

export default async function ClaimSchoolPage({
  params,
  searchParams,
}: PageProps<"/for-schools/claim/[schoolId]">) {
  const { schoolId } = await params;
  const rawSearchParams = await searchParams;

  const school = (await listPublicSchoolsByIds([schoolId])).at(0);
  if (!school) notFound();

  if (school.claim === "claimed") {
    redirect((await getSchoolCanonicalPath(school.id, "en")) ?? "/schools");
  }

  const errorCode = first(rawSearchParams.error);
  const errorMessage =
    errorCode === "missing_file"
      ? "Please choose a letter to upload."
      : errorCode === "upload_failed" || errorCode === "submit_failed"
        ? "Something went wrong. Please try again."
        : errorCode === "invalid"
          ? "Pick a verification method."
          : undefined;

  const email = school.email?.[0];
  const phone = school.phone?.[0];

  return (
    <div className="mx-auto max-w-(--container-read) px-4 py-8 md:px-10 md:py-12">
      <div className="flex flex-col gap-0.5 rounded-md border border-rule bg-copy-white p-3.5">
        <span className="font-display text-card font-semibold">
          {school.name_en ?? "Name not yet published"}
        </span>
        <span className="text-meta text-muted-ink">
          {formatGradeRange(school.min_class, school.max_class)}
          {school.locality_name ? ` · ${school.locality_name}` : ""}
        </span>
        <Link
          href="/for-schools/claim"
          className="mt-1 w-fit text-meta font-semibold text-ruled-blue"
        >
          Not your school? Search again
        </Link>
      </div>

      <h1 className="mt-6 font-display text-section font-semibold">
        How should we check you work here?
      </h1>
      <p className="mt-1 text-body text-muted-ink">
        We only use contact details already on public record for this school, so nobody can claim it
        with a personal number.
      </p>

      <form action={submitClaim} encType="multipart/form-data" className="mt-4 flex flex-col gap-4">
        <input type="hidden" name="schoolId" value={school.id} />

        {email && (
          <label className="flex flex-col gap-2 rounded-md border border-line-blue p-3.5 has-[:checked]:border-ruled-blue has-[:checked]:bg-pill-results-bg">
            <span className="flex items-center gap-2">
              <input
                type="radio"
                name="method"
                value="official_email"
                required
                className="h-4 w-4"
              />
              <span className="font-semibold">Official school email</span>
            </span>
            <span className="text-meta text-muted-ink">{maskEmail(email)} · on record</span>
            <input
              type="email"
              name="value"
              placeholder="Type the full email address"
              className="h-11 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none"
            />
          </label>
        )}

        {phone && (
          <label className="flex flex-col gap-2 rounded-md border border-line-blue p-3.5 has-[:checked]:border-ruled-blue has-[:checked]:bg-pill-results-bg">
            <span className="flex items-center gap-2">
              <input
                type="radio"
                name="method"
                value="phone_on_record"
                required
                className="h-4 w-4"
              />
              <span className="font-semibold">Phone on record</span>
            </span>
            <span className="text-meta text-muted-ink">{maskPhone(phone)} · on record</span>
            <input
              type="tel"
              name="value"
              placeholder="Type the full phone number"
              className="h-11 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none"
            />
          </label>
        )}

        <label className="flex flex-col gap-2 rounded-md border border-line-blue p-3.5 has-[:checked]:border-ruled-blue has-[:checked]:bg-pill-results-bg">
          <span className="flex items-center gap-2">
            <input type="radio" name="method" value="document" required className="h-4 w-4" />
            <span className="font-semibold">Letter on school letterhead</span>
          </span>
          <span className="text-meta text-muted-ink">
            Signed by the principal. Takes longer to check.
          </span>
          <input type="file" name="file" accept="image/*,application/pdf" className="text-body" />
        </label>

        {errorMessage && <FieldError id="claim-error">{errorMessage}</FieldError>}

        <button
          type="submit"
          className="flex h-12 w-fit items-center rounded-md bg-ruled-blue px-5 font-semibold text-copy-white"
        >
          Submit claim
        </button>
        <span className="text-meta text-muted-ink">
          Claiming is free. It never affects where your school appears in search.
        </span>
      </form>
    </div>
  );
}
