import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FieldError } from "@/components/ui/field-error";
import { getMySchoolId, getPostForSchool } from "@/lib/db/portal";
import { updateSchoolPost } from "./actions";

const ADMISSION_CLASS_OPTIONS = [
  { value: "nursery", label: "Nursery" },
  { value: "lkg", label: "LKG" },
  { value: "ukg", label: "UKG" },
  { value: "c1", label: "Class 1" },
  { value: "c2", label: "Class 2" },
  { value: "c3", label: "Class 3" },
  { value: "c4", label: "Class 4" },
  { value: "c5", label: "Class 5" },
  { value: "c6", label: "Class 6" },
  { value: "c7", label: "Class 7" },
  { value: "c8", label: "Class 8" },
  { value: "c9", label: "Class 9" },
  { value: "c10", label: "Class 10" },
  { value: "c11", label: "Class 11" },
  { value: "c12", label: "Class 12" },
] as const;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export const metadata: Metadata = {
  title: "Edit post — SchoolOye portal",
  robots: { index: false, follow: false },
};

export default async function EditSchoolPostPage({
  params,
  searchParams,
}: PageProps<"/portal/news/[id]">) {
  const { id } = await params;
  const rawSearchParams = await searchParams;
  const errorCode = first(rawSearchParams.error);

  const schoolId = await getMySchoolId();
  if (!schoolId) redirect("/for-schools");

  const post = await getPostForSchool(id, schoolId);
  if (!post) notFound();

  return (
    <div className="mx-auto max-w-(--container-read) px-4 py-8 md:px-10 md:py-12">
      <Link href="/portal/news" className="text-meta font-semibold text-ruled-blue">
        ← News & PR
      </Link>
      <h1 className="mt-1 font-display text-title-m md:text-title-d">Edit post</h1>

      {post.rejection_reason && (
        <div className="mt-3 rounded-md border border-pill-closed-bd bg-pill-closed-bg p-3 text-body">
          <span className="font-semibold">Not approved for /news: </span>
          {post.rejection_reason}
        </div>
      )}

      {post.listing_review === "pending" && (
        <p className="mt-3 rounded-md border border-sponsored-border p-3 text-body text-muted-ink">
          This post is currently under review for /news — editing is locked until that review
          finishes so the version ops sees doesn't shift underneath them.
        </p>
      )}

      <form action={updateSchoolPost} className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="postId" value={post.id} />

        <label className="flex flex-col gap-1.5">
          <span className="text-meta font-semibold text-muted-ink">Topic</span>
          <select
            name="topic"
            defaultValue={post.topic}
            disabled={post.listing_review === "pending"}
            className="h-12 w-fit rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none disabled:opacity-50"
          >
            <option value="general">General school update</option>
            <option value="admission_announcement">Admission announcement</option>
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-meta font-semibold text-muted-ink">Academic year (optional)</span>
          <input
            name="academicYear"
            defaultValue={post.admission_academic_year ?? ""}
            placeholder="2027-28"
            pattern="[0-9]{4}-[0-9]{2}"
            disabled={post.listing_review === "pending"}
            className="h-12 w-fit rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none disabled:opacity-50"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-meta font-semibold text-muted-ink">
            Classes / grades (optional)
          </span>
          <select
            name="classCodes"
            multiple
            defaultValue={post.admission_class_codes}
            disabled={post.listing_review === "pending"}
            className="min-h-24 w-fit rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none disabled:opacity-50"
          >
            {ADMISSION_CLASS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-meta font-semibold text-muted-ink">Opening date (optional)</span>
            <input
              type="date"
              name="opensOn"
              defaultValue={post.admission_opens_on ?? ""}
              disabled={post.listing_review === "pending"}
              className="h-12 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none disabled:opacity-50"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-meta font-semibold text-muted-ink">Closing date (optional)</span>
            <input
              type="date"
              name="closesOn"
              defaultValue={post.admission_closes_on ?? ""}
              disabled={post.listing_review === "pending"}
              className="h-12 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none disabled:opacity-50"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-meta font-semibold text-muted-ink">
            Application URL (HTTPS, optional)
          </span>
          <input
            type="url"
            name="applicationUrl"
            defaultValue={post.admission_application_url ?? ""}
            disabled={post.listing_review === "pending"}
            className="h-12 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none disabled:opacity-50"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-meta font-semibold text-muted-ink">
            Notice URL (HTTPS, optional)
          </span>
          <input
            type="url"
            name="noticeUrl"
            defaultValue={post.admission_notice_url ?? ""}
            disabled={post.listing_review === "pending"}
            className="h-12 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none disabled:opacity-50"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-meta font-semibold text-muted-ink">Headline</span>
          <input
            type="text"
            name="title"
            required
            maxLength={200}
            defaultValue={post.title}
            disabled={post.listing_review === "pending"}
            className="h-12 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none disabled:opacity-50"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-meta font-semibold text-muted-ink">Details</span>
          <textarea
            name="body"
            required
            rows={6}
            maxLength={5000}
            defaultValue={post.body}
            disabled={post.listing_review === "pending"}
            className="rounded-md border border-line-blue-strong bg-copy-white p-3 text-body outline-none disabled:opacity-50"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-meta font-semibold text-muted-ink">Source link (optional)</span>
          <input
            type="url"
            name="sourceUrl"
            defaultValue={post.source_url ?? ""}
            disabled={post.listing_review === "pending"}
            className="h-12 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none disabled:opacity-50"
          />
        </label>

        {errorCode && (
          <FieldError id="post-edit-error">
            {errorCode === "locked"
              ? "This post is locked while its /news listing is under review."
              : "Check the required fields — headline and details are needed."}
          </FieldError>
        )}

        <button
          type="submit"
          disabled={post.listing_review === "pending"}
          className="flex h-12 w-fit items-center rounded-md bg-ruled-blue px-5 font-semibold text-copy-white disabled:opacity-50"
        >
          Save changes
        </button>
      </form>
    </div>
  );
}
