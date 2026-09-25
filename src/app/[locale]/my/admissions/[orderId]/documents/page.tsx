import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AutoSubmitFileInput } from "@/components/ui/auto-submit-file-input";
import { FieldError } from "@/components/ui/field-error";
import {
  getMyOrder,
  listApplicationsForOrders,
  listDocumentsForChild,
} from "@/lib/db/application-help";
import { createSessionClient } from "@/lib/db/session";
import { deleteDocument, uploadDocument } from "../actions";

const CHECKLIST: { kind: string; label: string }[] = [
  { kind: "birth_certificate", label: "Birth certificate" },
  { kind: "address_proof", label: "Address proof" },
  { kind: "photo_child", label: "Child's photo" },
  { kind: "aadhaar_masked", label: "Child's Aadhaar" },
  // No enum value maps cleanly to "parent's ID proof" — closest is `other`, noted
  // in this session's report as a data-model gap worth a dedicated doc_type later.
  { kind: "other", label: "Parent's ID proof" },
];

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Documents — SchoolOye", robots: { index: false, follow: false } };
}

export default async function OrderDocumentsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/my/admissions/[orderId]/documents">) {
  const { locale, orderId } = await params;
  const rawSearchParams = await searchParams;

  const order = await getMyOrder(orderId);
  if (!order) redirect(`/${locale}/my/admissions`);
  if (order.status === "awaiting_payment") {
    redirect(`/${locale}/admissions/help/checkout?order=${orderId}`);
  }

  const [documents, applications] = await Promise.all([
    listDocumentsForChild(order.child_id),
    listApplicationsForOrders([order.id]),
  ]);
  const byKind = new Map(documents.map((d) => [d.kind, d]));
  const readyCount = CHECKLIST.filter((item) => byKind.has(item.kind)).length;
  const missingCount = CHECKLIST.length - readyCount;

  const hasSubmittedApplication = applications.some(
    (a) => a.status !== "not_started" && a.status !== "preparing",
  );

  const confirmDeleteId = first(rawSearchParams.confirm_delete);
  const errorCode = first(rawSearchParams.error);

  const supabase = await createSessionClient();
  const signedUrls = new Map<string, string>();
  for (const doc of documents) {
    const { data } = await supabase.storage.from("documents").createSignedUrl(doc.storage_path, 60);
    if (data?.signedUrl) signedUrls.set(doc.id, data.signedUrl);
  }

  return (
    <div className="mx-auto max-w-(--container-read) px-4 py-8 md:px-10 md:py-12">
      <p className="text-meta font-semibold text-muted-ink">2 of 2</p>
      <h1 className="font-display text-title-m md:text-title-d">
        {readyCount} of {CHECKLIST.length} ready
      </h1>
      <div className="mt-2 grid grid-cols-5 gap-1">
        {CHECKLIST.map((item) => (
          <span
            key={item.kind}
            className={`h-1 rounded-full ${byKind.has(item.kind) ? "bg-margin-green" : "bg-rule"}`}
          />
        ))}
      </div>
      <p className="mt-2 text-meta text-muted-ink">
        A clear phone photo is fine. We check each one before use.
      </p>

      {errorCode && (
        <div className="mt-3">
          <FieldError id="doc-error">
            {errorCode === "upload_failed"
              ? "Couldn't upload that file. Please try again."
              : "Please choose a file and a document type."}
          </FieldError>
        </div>
      )}

      <div className="mt-4 flex flex-col">
        {CHECKLIST.map((item) => {
          const doc = byKind.get(item.kind);
          return (
            <div
              key={item.kind}
              className="flex items-center gap-3 border-t border-rule-soft py-3 first:border-t-0"
            >
              <span
                aria-hidden="true"
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-meta font-bold ${
                  doc
                    ? "border border-margin-green-border bg-margin-green-bg text-margin-green"
                    : "border border-dashed border-line-blue"
                }`}
              >
                {doc ? "✓" : ""}
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="font-semibold">{item.label}</span>
                <span className="text-meta text-muted-ink">
                  {doc ? (
                    <>
                      Ready ·{" "}
                      {signedUrls.has(doc.id) ? (
                        <a
                          href={signedUrls.get(doc.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-ruled-blue"
                        >
                          View
                        </a>
                      ) : (
                        "uploaded"
                      )}
                    </>
                  ) : (
                    "Missing"
                  )}
                </span>
              </div>

              {doc ? (
                confirmDeleteId === doc.id ? (
                  <div className="flex flex-col items-end gap-1">
                    {hasSubmittedApplication && (
                      <span className="max-w-40 text-right text-meta text-muted-ink">
                        May already be attached to a submitted application.
                      </span>
                    )}
                    <div className="flex gap-2">
                      <Link
                        href={`/${locale}/my/admissions/${orderId}/documents`}
                        className="flex h-9 items-center rounded-md border border-line-blue px-3 text-meta font-semibold"
                      >
                        Cancel
                      </Link>
                      <form action={deleteDocument}>
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="orderId" value={orderId} />
                        <input type="hidden" name="docId" value={doc.id} />
                        <input type="hidden" name="storagePath" value={doc.storage_path} />
                        <button
                          type="submit"
                          className="flex h-9 items-center rounded-md border border-ink px-3 text-meta font-semibold"
                        >
                          Confirm remove
                        </button>
                      </form>
                    </div>
                  </div>
                ) : (
                  <Link
                    href={`/${locale}/my/admissions/${orderId}/documents?confirm_delete=${doc.id}`}
                    className="flex h-11 shrink-0 items-center rounded-md border border-line-blue px-3 text-meta font-semibold"
                  >
                    Remove
                  </Link>
                )
              ) : (
                <form
                  action={uploadDocument}
                  encType="multipart/form-data"
                  className="flex shrink-0 items-center"
                >
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="orderId" value={orderId} />
                  <input type="hidden" name="childId" value={order.child_id} />
                  <input type="hidden" name="kind" value={item.kind} />
                  <AutoSubmitFileInput
                    name="file"
                    accept="image/*,application/pdf"
                    className="flex h-11 cursor-pointer items-center rounded-md bg-ruled-blue px-4 text-meta font-semibold text-copy-white"
                  >
                    Upload
                  </AutoSubmitFileInput>
                </form>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex flex-col gap-1.5">
        <Link
          href={`/${locale}/my/admissions`}
          className="flex h-12 w-fit items-center rounded-md bg-ruled-blue px-5 font-semibold text-copy-white"
        >
          {missingCount > 0 ? `Continue with ${missingCount} missing` : "Continue"}
        </Link>
        <span className="text-meta text-muted-ink">
          We'll remind you on WhatsApp. Forms can't be submitted until all are ready.
        </span>
      </div>
    </div>
  );
}
