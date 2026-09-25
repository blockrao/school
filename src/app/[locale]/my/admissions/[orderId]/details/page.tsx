import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FieldError } from "@/components/ui/field-error";
import { getMyOrder, listMyChildren } from "@/lib/db/application-help";
import { saveOrderIntake } from "../actions";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Child's details — SchoolOye", robots: { index: false, follow: false } };
}

export default async function OrderDetailsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/my/admissions/[orderId]/details">) {
  const { locale, orderId } = await params;
  const rawSearchParams = await searchParams;

  const order = await getMyOrder(orderId);
  if (!order) redirect(`/${locale}/my/admissions`);
  if (order.status === "awaiting_payment") {
    redirect(`/${locale}/admissions/help/checkout?order=${orderId}`);
  }

  const children = await listMyChildren();
  const child = children.find((c) => c.id === order.child_id);
  const errorCode = first(rawSearchParams.error);
  const intake = order.intake ?? {};

  return (
    <div className="mx-auto max-w-(--container-read) px-4 py-8 md:px-10 md:py-12">
      <p className="text-meta font-semibold text-muted-ink">1 of 2</p>
      <h1 className="font-display text-title-m md:text-title-d">Child's details</h1>
      <p className="mt-1 text-body text-muted-ink">
        Fill these once. We use them on every school's form.
      </p>

      {child && (
        <p className="mt-4 rounded-md border border-rule bg-copy-white p-3 text-body">
          For <span className="font-semibold">{child.first_name}</span>, born{" "}
          {new Date(child.date_of_birth).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
          . To change name or date of birth,{" "}
          <a href="mailto:help@schooloye.in" className="font-semibold text-ruled-blue">
            contact us
          </a>
          .
        </p>
      )}

      <form action={saveOrderIntake} className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="orderId" value={orderId} />

        <label className="flex flex-col gap-1.5">
          <span className="text-meta font-semibold text-muted-ink">Gender</span>
          <select
            name="gender"
            defaultValue={intake.gender ?? ""}
            className="h-12 w-fit rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none"
          >
            <option value="">Select</option>
            <option value="boy">Boy</option>
            <option value="girl">Girl</option>
            <option value="other">Other</option>
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-meta font-semibold text-muted-ink">Parent's name</span>
          <input
            type="text"
            name="parentName"
            defaultValue={intake.parent_name ?? ""}
            className="h-12 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-meta font-semibold text-muted-ink">Home address</span>
          <textarea
            name="address"
            rows={3}
            defaultValue={intake.address ?? ""}
            className="rounded-md border border-line-blue-strong bg-copy-white p-3 text-body outline-none"
          />
          <span className="text-meta text-muted-ink">
            Used for distance points. Must match your address proof.
          </span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-meta font-semibold text-muted-ink">
            Sibling in any school? (optional)
          </span>
          <input
            type="text"
            name="sibling"
            defaultValue={intake.sibling ?? ""}
            className="h-12 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none"
          />
        </label>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="text-meta font-semibold text-muted-ink">Category</legend>
          <div className="grid grid-cols-3 gap-0 overflow-hidden rounded-md border border-line-blue">
            {(["general", "ews", "dg"] as const).map((cat) => (
              <label
                key={cat}
                className="flex h-11 items-center justify-center border-r border-line-blue text-body last:border-r-0 has-[:checked]:bg-ruled-blue has-[:checked]:text-copy-white"
              >
                <input
                  type="radio"
                  name="category"
                  value={cat}
                  defaultChecked={(intake.category ?? "general") === cat}
                  className="sr-only"
                />
                {cat === "general" ? "General" : cat.toUpperCase()}
              </label>
            ))}
          </div>
        </fieldset>

        {errorCode && (
          <FieldError id="intake-error">
            Something went wrong saving your details. Please try again.
          </FieldError>
        )}

        <button
          type="submit"
          className="flex h-12 items-center rounded-md bg-ruled-blue px-5 font-semibold text-copy-white"
        >
          Save and continue
        </button>
      </form>
    </div>
  );
}
