import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FieldError } from "@/components/ui/field-error";
import { listApplicationHelpProducts, listMyChildren } from "@/lib/db/application-help";
import { createSessionClient, getSessionUser } from "@/lib/db/session";
import { formatCurrency } from "@/lib/format";
import { localePrefix } from "@/lib/urls";
import { addChild, startCheckout } from "../actions";

// design-pending: the design's 7b (Package picker) assumes a child is already on
// file and starts straight at package selection. The data model requires
// application_orders.child_id at order-creation time, so a "which child" step has
// to happen first — no design covers it. Built from page tokens + the existing
// radio-picker pattern (matches WhatsApp Alerts' class picker). Logged in
// docs/design-gaps.md.

const PACKAGE_DESCRIPTIONS: Record<string, string> = {
  help_single: "Try it for one form",
  help_bundle_3: "Most parents pick this",
  help_bundle_5: "For a wider search",
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Application help — SchoolOye", robots: { index: false, follow: false } };
}

export default async function ApplicationHelpPackagePage({
  params,
  searchParams,
}: PageProps<"/[locale]/admissions/help/package">) {
  const { locale } = await params;
  const rawSearchParams = await searchParams;

  const supabase = await createSessionClient();
  const user = await getSessionUser(supabase);
  if (!user) {
    redirect(
      `${localePrefix(locale)}/sign-in?next=${encodeURIComponent(`${localePrefix(locale)}/admissions/help/package`)}`,
    );
  }

  const [children, products] = await Promise.all([listMyChildren(), listApplicationHelpProducts()]);

  const selectedChildId = first(rawSearchParams.child) ?? children[0]?.id;
  const errorCode = first(rawSearchParams.error);
  const errorMessage =
    errorCode === "invalid_child"
      ? "Enter the child's name and date of birth."
      : errorCode === "invalid_selection"
        ? "Pick a child and a package."
        : errorCode === "order_failed"
          ? "Couldn't start your order. Please try again."
          : undefined;

  return (
    <div className="mx-auto max-w-(--container-read) px-4 py-8 md:px-10 md:py-12">
      <h1 className="font-display text-title-m md:text-title-d">How many schools?</h1>
      <p className="mt-1 text-body text-muted-ink">You pick the schools after checkout.</p>

      {children.length === 0 ? (
        <form action={addChild} className="mt-6 flex flex-col gap-4">
          <input type="hidden" name="locale" value={locale} />
          <p className="text-body text-muted-ink">Add your child to get started.</p>
          <label className="flex flex-col gap-1.5">
            <span className="text-meta font-semibold text-muted-ink">
              Child's full name (as on birth certificate)
            </span>
            <input
              type="text"
              name="firstName"
              required
              className="h-12 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-meta font-semibold text-muted-ink">Date of birth</span>
            <input
              type="date"
              name="dateOfBirth"
              required
              max={new Date().toISOString().slice(0, 10)}
              className="h-12 w-fit rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-meta font-semibold text-muted-ink">
              Class you're applying for (optional)
            </span>
            <select
              name="targetClass"
              defaultValue=""
              className="h-12 w-fit rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none"
            >
              <option value="">Not sure yet</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={`c${n}`}>
                  Class {n}
                </option>
              ))}
            </select>
          </label>
          {errorMessage && <FieldError id="child-error">{errorMessage}</FieldError>}
          <button
            type="submit"
            className="flex h-12 w-fit items-center rounded-md bg-ruled-blue px-5 font-semibold text-copy-white"
          >
            Continue
          </button>
        </form>
      ) : (
        <form action={startCheckout} className="mt-6 flex flex-col gap-6">
          <input type="hidden" name="locale" value={locale} />

          {children.length > 1 && (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-meta font-semibold text-muted-ink">Which child?</legend>
              <div className="flex flex-col gap-2">
                {children.map((child) => (
                  <label
                    key={child.id}
                    className="flex h-12 items-center gap-3 rounded-md border border-line-blue px-3 has-[:checked]:border-ruled-blue has-[:checked]:bg-pill-results-bg"
                  >
                    <input
                      type="radio"
                      name="childId"
                      value={child.id}
                      defaultChecked={child.id === selectedChildId}
                      className="h-4 w-4"
                    />
                    <span className="font-semibold">{child.first_name}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          {children.length === 1 && <input type="hidden" name="childId" value={children[0].id} />}

          <fieldset className="flex flex-col gap-2.5">
            <legend className="sr-only">Package</legend>
            {products.map((product, i) => (
              <label
                key={product.code}
                className="flex items-center gap-3.5 rounded-md border border-line-blue p-4 has-[:checked]:border-ruled-blue has-[:checked]:bg-pill-results-bg"
              >
                <input
                  type="radio"
                  name="productCode"
                  value={product.code}
                  defaultChecked={i === Math.min(1, products.length - 1)}
                  className="h-5 w-5"
                />
                <div className="flex flex-1 flex-col gap-0.5">
                  <span className="font-display text-card font-semibold">{product.name}</span>
                  <span className="text-meta text-muted-ink">
                    {PACKAGE_DESCRIPTIONS[product.code] ?? ""}
                  </span>
                </div>
                <span className="font-bold text-card">{formatCurrency(product.price_inr)}</span>
              </label>
            ))}
          </fieldset>

          <p className="text-meta text-muted-ink">
            Every package includes form filling, document checks, submission and WhatsApp updates.
            Full refund for any school whose form we haven't submitted yet.
          </p>

          {errorMessage && <FieldError id="package-error">{errorMessage}</FieldError>}

          <button
            type="submit"
            className="flex h-12 w-fit items-center rounded-md bg-ruled-blue px-5 font-semibold text-copy-white"
          >
            Continue
          </button>
        </form>
      )}
    </div>
  );
}
