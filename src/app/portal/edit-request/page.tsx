import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FieldError } from "@/components/ui/field-error";
import { getMySchoolId } from "@/lib/db/portal";
import { submitEditRequest } from "./actions";

const FIELDS = [
  "Phone",
  "Email",
  "Website",
  "Address",
  "About / description",
  "Management type",
  "Medium of instruction",
  "Something else",
];

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export const metadata: Metadata = {
  title: "Request an edit — SchoolOye portal",
  robots: { index: false, follow: false },
};

export default async function EditRequestPage({ searchParams }: PageProps<"/portal/edit-request">) {
  const rawSearchParams = await searchParams;

  const schoolId = await getMySchoolId();
  if (!schoolId) redirect("/for-schools");

  const errorCode = first(rawSearchParams.error);

  return (
    <div className="mx-auto max-w-(--container-read) px-4 py-8 md:px-10 md:py-12">
      <Link href="/portal" className="text-meta font-semibold text-ruled-blue">
        ← Dashboard
      </Link>
      <h1 className="mt-1 font-display text-title-m md:text-title-d">Request a profile edit</h1>
      <p className="mt-1 text-body text-muted-ink">
        Changes go live after SchoolOye checks them — usually the same working day.
      </p>

      <form action={submitEditRequest} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-meta font-semibold text-muted-ink">
            What would you like to change?
          </span>
          <select
            name="field"
            defaultValue={FIELDS[0]}
            className="h-12 w-fit rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none"
          >
            {FIELDS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-meta font-semibold text-muted-ink">
            Current value (if you know it)
          </span>
          <input
            type="text"
            name="currentValue"
            className="h-12 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-meta font-semibold text-muted-ink">New value</span>
          <textarea
            name="newValue"
            required
            rows={3}
            className="rounded-md border border-line-blue-strong bg-copy-white p-3 text-body outline-none"
          />
        </label>

        {errorCode && (
          <FieldError id="edit-error">
            {errorCode === "invalid"
              ? "Enter the new value."
              : "Something went wrong. Please try again."}
          </FieldError>
        )}

        <button
          type="submit"
          className="flex h-12 w-fit items-center rounded-md bg-ruled-blue px-5 font-semibold text-copy-white"
        >
          Submit request
        </button>
      </form>
    </div>
  );
}
