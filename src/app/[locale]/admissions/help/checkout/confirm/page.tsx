import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getMyOrder } from "@/lib/db/application-help";
import { formatCurrency } from "@/lib/format";
import { localePrefix } from "@/lib/urls";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Order received — SchoolOye", robots: { index: false, follow: false } };
}

export default async function CheckoutConfirmPage({
  params,
  searchParams,
}: PageProps<"/[locale]/admissions/help/checkout/confirm">) {
  const { locale } = await params;
  const rawSearchParams = await searchParams;
  const orderId = first(rawSearchParams.order);

  const order = orderId ? await getMyOrder(orderId) : null;
  if (!order) redirect(`${localePrefix(locale)}/admissions/help/package`);

  return (
    <div className="mx-auto max-w-(--container-read) px-4 py-8 md:px-10 md:py-12">
      <h1 className="font-display text-title-m md:text-title-d">Order received</h1>
      <p className="mt-2 text-body text-muted-ink">
        Order {order.id.slice(0, 8)} · {formatCurrency(order.amount_inr)}
      </p>
      <p className="mt-4 rounded-md border border-rule bg-copy-white p-4 text-body">
        We'll confirm payment details with you shortly. Once payment is confirmed, you'll be able to
        share your child's details and documents here.
      </p>
      <Link
        href={`${localePrefix(locale)}/my/admissions`}
        className="mt-6 inline-flex h-12 items-center rounded-md border border-ruled-blue px-5 font-semibold text-ruled-blue"
      >
        Go to My Admissions
      </Link>
    </div>
  );
}
