import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FieldError } from "@/components/ui/field-error";
import { getMySchoolId } from "@/lib/db/portal";
import { submitAdmissionNotice } from "./actions";

// Adapted from design/School Portal.dc.html 18d: the design shows a PDF upload
// with AI-extracted fields the admin just confirms. No OCR/AI-extraction infra
// exists in this repo, and admission_notices.url is NOT NULL (it's the
// canonical link to the notice, not a generic attachment slot) — built as a
// link-plus-manual-fields form instead: the admin pastes the URL where the
// notice is actually published and types the same facts directly. Honest about
// not auto-reading a PDF, rather than faking extraction.

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export const metadata: Metadata = {
  title: "Post an admission notice — SchoolOye portal",
  robots: { index: false, follow: false },
};

export default async function NewNoticePage({ searchParams }: PageProps<"/portal/notices/new">) {
  const rawSearchParams = await searchParams;

  const schoolId = await getMySchoolId();
  if (!schoolId) redirect("/for-schools");

  const errorCode = first(rawSearchParams.error);

  return (
    <div className="mx-auto max-w-(--container-read) px-4 py-8 md:px-10 md:py-12">
      <Link href="/portal" className="text-meta font-semibold text-ruled-blue">
        ← Dashboard
      </Link>
      <h1 className="mt-1 font-display text-title-m md:text-title-d">Post an admission notice</h1>
      <p className="mt-1 text-body text-muted-ink">
        Checked by SchoolOye within 1 working day before it goes live.
      </p>

      <form action={submitAdmissionNotice} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-meta font-semibold text-muted-ink">
            Link to the notice on your website
          </span>
          <input
            type="url"
            name="url"
            required
            placeholder="https://yourschool.edu.in/admissions"
            className="h-12 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none"
          />
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-meta font-semibold text-muted-ink">Session</span>
            <input
              type="text"
              name="session"
              required
              placeholder="2027–28"
              className="h-12 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-meta font-semibold text-muted-ink">Classes</span>
            <input
              type="text"
              name="classes"
              required
              placeholder="Nursery, Class 1"
              className="h-12 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-meta font-semibold text-muted-ink">Form type</span>
            <select
              name="formType"
              defaultValue="online"
              className="h-12 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none"
            >
              <option value="online">Online</option>
              <option value="offline">Offline</option>
              <option value="both">Both</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-meta font-semibold text-muted-ink">Registration fee (₹)</span>
            <input
              type="text"
              name="registrationFee"
              placeholder="1000"
              className="h-12 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-meta font-semibold text-muted-ink">Forms open</span>
            <input
              type="date"
              name="opensOn"
              className="h-12 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-meta font-semibold text-muted-ink">Last date</span>
            <input
              type="date"
              name="closesOn"
              className="h-12 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none"
            />
          </label>
        </div>

        {errorCode && (
          <FieldError id="notice-error">
            {errorCode === "invalid"
              ? "Check the link and required fields."
              : "Something went wrong. Please try again."}
          </FieldError>
        )}

        <button
          type="submit"
          className="flex h-12 w-fit items-center rounded-md bg-ruled-blue px-5 font-semibold text-copy-white"
        >
          Submit for checking
        </button>
      </form>
    </div>
  );
}
