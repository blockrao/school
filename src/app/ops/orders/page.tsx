import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/ui/state-message";
import { listAwaitingPaymentOrdersForStaff } from "@/lib/db/application-help";
import { createSessionClient, getSessionUser } from "@/lib/db/session";
import { markOrderPaidByStaff } from "./actions";

// Minimal, scoped only to the manual-provider "mark paid" step (Apply plan point
// on the manual payment provider). NOT the full Ops Verification Queue
// (Flow 6.15, docs/screen-map.md) — that's a separate, unbuilt, much larger
// screen for school/data verification.

export const metadata: Metadata = {
  title: "Orders — SchoolOye ops",
  robots: { index: false, follow: false },
};

export default async function OpsOrdersPage() {
  const supabase = await createSessionClient();
  const user = await getSessionUser(supabase);
  if (!user) redirect("/en/sign-in?next=%2Fops%2Forders");

  const { data: isStaff } = await supabase.rpc("is_staff");
  if (!isStaff) redirect("/en");

  const orders = await listAwaitingPaymentOrdersForStaff();

  return (
    <div className="mx-auto max-w-(--container-page) px-4 py-6 md:px-10 md:py-9">
      <h1 className="font-display text-title-m md:text-title-d">Orders awaiting payment</h1>
      <p className="mt-1 text-body text-muted-ink">
        Manual provider — mark an order paid once you've confirmed payment outside the app.
      </p>

      {orders.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Nothing waiting"
            description="No orders are currently awaiting payment confirmation."
            nextStepLabel="Back home"
            nextStepHref="/en"
          />
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-2">
          {orders.map((order) => (
            <div
              key={order.id}
              className="flex items-center justify-between gap-3 rounded-md border border-rule p-3"
            >
              <div className="flex flex-col">
                <span className="font-semibold">
                  {order.child_name} · {order.product_code}
                </span>
                <span className="text-meta text-muted-ink">
                  ₹{order.amount_inr.toLocaleString("en-IN")} · order {order.id.slice(0, 8)} ·{" "}
                  {new Date(order.created_at).toLocaleString("en-IN")}
                </span>
              </div>
              <form action={markOrderPaidByStaff}>
                <input type="hidden" name="orderId" value={order.id} />
                <button
                  type="submit"
                  className="flex h-11 shrink-0 items-center rounded-md bg-ruled-blue px-4 font-semibold text-copy-white"
                >
                  Mark paid
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
