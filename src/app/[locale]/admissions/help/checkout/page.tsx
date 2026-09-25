import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getMyOrder, getProductByCode } from "@/lib/db/application-help";
import { getPaymentProvider } from "@/lib/payments/provider";
import { payForOrder } from "../actions";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Checkout — SchoolOye", robots: { index: false, follow: false } };
}

export default async function CheckoutPage({
  params,
  searchParams,
}: PageProps<"/[locale]/admissions/help/checkout">) {
  const { locale } = await params;
  const rawSearchParams = await searchParams;
  const orderId = first(rawSearchParams.order);

  const order = orderId ? await getMyOrder(orderId) : null;
  if (!order) redirect(`/${locale}/admissions/help/package`);

  if (order.status !== "awaiting_payment") {
    redirect(`/${locale}/my/admissions/${order.id}/details`);
  }

  const product = await getProductByCode(order.product_code);
  const provider = getPaymentProvider();

  const gstRate = product?.gst_rate ?? 0;
  const gstAmount = Math.round((order.amount_inr * gstRate) / (100 + gstRate));
  const ctaLabel = provider.name === "mock" ? `Pay ₹${order.amount_inr} (test)` : "Continue";

  return (
    <div className="mx-auto max-w-(--container-read) px-4 py-8 md:px-10 md:py-12">
      <h1 className="font-display text-title-m md:text-title-d">Checkout</h1>

      <div className="mt-6 rounded-md border border-rule bg-copy-white">
        <div className="flex justify-between border-b border-rule-soft p-3.5">
          <span>{product?.name ?? order.product_code}</span>
          <span className="font-semibold">₹{order.amount_inr.toLocaleString("en-IN")}</span>
        </div>
        <div className="flex justify-between border-b border-rule-soft p-3.5 text-meta text-muted-ink">
          <span>GST ({product?.gst_rate ?? 18}%, included)</span>
          <span>₹{gstAmount.toLocaleString("en-IN")}</span>
        </div>
        <div className="flex justify-between p-3.5">
          <span className="font-semibold">You pay now</span>
          <span className="font-bold text-card">₹{order.amount_inr.toLocaleString("en-IN")}</span>
        </div>
      </div>

      <p className="mt-4 border-l-2 border-ink py-1 pl-3 text-meta text-muted-ink">
        School fees are not included. You pay each school directly when you approve its form.
      </p>

      <form action={payForOrder} className="mt-8 flex flex-col gap-1.5">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="orderId" value={order.id} />
        <input type="hidden" name="amountInr" value={order.amount_inr} />
        <input type="hidden" name="productName" value={product?.name ?? order.product_code} />
        <button
          type="submit"
          className="flex h-12 w-fit items-center rounded-md bg-ruled-blue px-5 font-semibold text-copy-white"
        >
          {ctaLabel}
        </button>
        {provider.name === "manual" && (
          <span className="text-meta text-muted-ink">
            We'll confirm payment details with you shortly.
          </span>
        )}
      </form>
    </div>
  );
}
