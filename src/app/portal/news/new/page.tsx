import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FieldError } from "@/components/ui/field-error";
import { getMySchoolId } from "@/lib/db/portal";
import { submitSchoolPost } from "./actions";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export const metadata: Metadata = {
  title: "Publish news — SchoolOye portal",
  robots: { index: false, follow: false },
};

export default async function NewSchoolPostPage({ searchParams }: PageProps<"/portal/news/new">) {
  const rawSearchParams = await searchParams;

  const schoolId = await getMySchoolId();
  if (!schoolId) redirect("/for-schools");

  const errorCode = first(rawSearchParams.error);

  return (
    <div className="mx-auto max-w-(--container-read) px-4 py-8 md:px-10 md:py-12">
      <Link href="/portal/news" className="text-meta font-semibold text-ruled-blue">
        ← News & PR
      </Link>
      <h1 className="mt-1 font-display text-title-m md:text-title-d">
        Publish news or a PR update
      </h1>
      <p className="mt-1 text-body text-muted-ink">
        An award, a new campus, a milestone — checked by SchoolOye before it goes live.
      </p>

      <form action={submitSchoolPost} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-meta font-semibold text-muted-ink">Type</span>
          <select
            name="kind"
            defaultValue="news"
            className="h-12 w-fit rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none"
          >
            <option value="news">News</option>
            <option value="press">Press release</option>
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-meta font-semibold text-muted-ink">Headline</span>
          <input
            type="text"
            name="title"
            required
            maxLength={200}
            placeholder="Our students won the state science olympiad"
            className="h-12 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-meta font-semibold text-muted-ink">Details</span>
          <textarea
            name="body"
            required
            rows={6}
            maxLength={5000}
            className="rounded-md border border-line-blue-strong bg-copy-white p-3 text-body outline-none"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-meta font-semibold text-muted-ink">Source link (optional)</span>
          <input
            type="url"
            name="sourceUrl"
            placeholder="https://yourschool.edu.in/news/..."
            className="h-12 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none"
          />
        </label>

        {errorCode && (
          <FieldError id="post-error">
            {errorCode === "invalid"
              ? "Check the required fields — headline and details are needed."
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
