import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getMyOrder } from "@/lib/db/application-help";
import { serverEnv } from "@/lib/env.server";
import { simulatePayment } from "./actions";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Test checkout — SchoolOye", robots: { index: false, follow: false } };
}

// force-dynamic: the PAYMENT_PROVIDER check below is the very first line and
// exits via notFound() before touching any dynamic API — without this, Next
// treats the page as static, prerenders it once at build time, and bakes in
// whatever PAYMENT_PROVIDER happened to be set during that build forever
// (caught by testing this route with PAYMENT_PROVIDER=mock set only at runtime,
// after a build done with the default "manual" — it still 404'd).
export const dynamic = "force-dynamic";

// Dev/preview only — never reachable in production. env.server.ts already
// refuses to boot with PAYMENT_PROVIDER=mock when VERCEL_ENV=production; this is
// a second, route-level check in case that ever changes.
export default async function MockCheckoutPage({
  params,
  searchParams,
}: PageProps<"/[locale]/admissions/help/checkout/mock">) {
  if (serverEnv.PAYMENT_PROVIDER !== "mock") notFound();

  const { locale } = await params;
  const rawSearchParams = await searchParams;
  const orderId = first(rawSearchParams.order);
  const failed = first(rawSearchParams.result) === "failed";

  const order = orderId ? await getMyOrder(orderId) : null;
  if (!order) redirect(`/${locale}/admissions/help/package`);

  return (
    <div className="mx-auto max-w-(--container-read) px-4 py-8 md:px-10 md:py-12">
      <div className="mb-4 flex items-center gap-2 rounded-md bg-pencil-yellow/30 px-3 py-2 text-meta font-semibold">
        Test checkout — no real payment is taken
      </div>
      <h1 className="font-display text-title-m md:text-title-d">Simulate payment</h1>
      <p className="mt-1 text-body text-muted-ink">
        Order {order.id.slice(0, 8)} · ₹{order.amount_inr.toLocaleString("en-IN")}
      </p>

      {failed && (
        <p className="mt-4 border-l-2 border-ink py-1 pl-3 text-body">
          Simulated payment failure — order is still awaiting payment.
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <form action={simulatePayment}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="orderId" value={order.id} />
          <input type="hidden" name="result" value="success" />
          <button
            type="submit"
            className="flex h-12 w-full items-center justify-center rounded-md bg-ruled-blue px-5 font-semibold text-copy-white sm:w-auto"
          >
            Simulate success
          </button>
        </form>
        <form action={simulatePayment}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="orderId" value={order.id} />
          <input type="hidden" name="result" value="failure" />
          <button
            type="submit"
            className="flex h-12 w-full items-center justify-center rounded-md border border-ruled-blue px-5 font-semibold text-ruled-blue sm:w-auto"
          >
            Simulate failure
          </button>
        </form>
      </div>
    </div>
  );
}
