import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ApplicationStatusRow } from "@/components/ui/application-status-row";
import { EmptyState } from "@/components/ui/state-message";
import type { Application } from "@/lib/db/application-help";
import { listApplicationsForOrders, listMyChildren, listMyOrders } from "@/lib/db/application-help";
import { listPublicSchoolsByIds } from "@/lib/db/public-adapter";
import { createSessionClient, getSessionUser } from "@/lib/db/session";
import { formatCurrency } from "@/lib/format";
import { localePrefix } from "@/lib/urls";
import { approveApplication } from "./actions";

// Design (7f) shows 4 status tones via ApplicationStatusRow (already built in the
// Components Sheet). application_status has more values than that — everything
// past "submitted" (fee_pending, result_selected/waitlisted/not_selected,
// withdrawn) maps onto the closest of the 4 existing tones rather than adding a
// 5th, since the component is shared with nothing to compare a 5th tone against.

function toneFor(
  status: Application["status"],
): "preparing" | "waiting-approval" | "submitted" | "interview" {
  switch (status) {
    case "not_started":
    case "preparing":
    case "result_not_selected":
    case "withdrawn":
      return "preparing";
    case "awaiting_parent_approval":
    case "result_waitlisted":
      return "waiting-approval";
    case "submitted":
    case "fee_pending":
    case "result_selected":
      return "submitted";
    case "interview_scheduled":
      return "interview";
  }
}

const STATUS_LABEL: Record<Application["status"], string> = {
  not_started: "Not started",
  preparing: "Preparing",
  awaiting_parent_approval: "Waiting for your approval",
  submitted: "Submitted",
  fee_pending: "Fee pending",
  interview_scheduled: "Interview scheduled",
  result_selected: "Selected",
  result_waitlisted: "Waitlisted",
  result_not_selected: "Not selected",
  withdrawn: "Withdrawn",
};

export async function generateMetadata(): Promise<Metadata> {
  return { title: "My Admissions — SchoolOye", robots: { index: false, follow: false } };
}

export default async function MyAdmissionsPage({ params }: PageProps<"/[locale]/my/admissions">) {
  const { locale } = await params;

  const supabase = await createSessionClient();
  const user = await getSessionUser(supabase);
  if (!user) {
    redirect(
      `${localePrefix(locale)}/sign-in?next=${encodeURIComponent(`${localePrefix(locale)}/my/admissions`)}`,
    );
  }

  const [orders, children] = await Promise.all([listMyOrders(), listMyChildren()]);
  const childById = new Map(children.map((c) => [c.id, c]));

  const paidOrders = orders.filter((o) => o.status !== "awaiting_payment");
  const applications = await listApplicationsForOrders(paidOrders.map((o) => o.id));
  const applicationsByOrder = new Map<string, Application[]>();
  for (const app of applications) {
    if (!app.order_id) continue;
    const list = applicationsByOrder.get(app.order_id) ?? [];
    list.push(app);
    applicationsByOrder.set(app.order_id, list);
  }

  const schoolIds = [...new Set(applications.map((a) => a.school_id))];
  const schools = schoolIds.length > 0 ? await listPublicSchoolsByIds(schoolIds) : [];
  const schoolNameById = new Map(schools.map((s) => [s.id, s.name_en ?? "School"]));

  return (
    <div className="mx-auto max-w-(--container-read) px-4 py-8 md:px-10 md:py-12">
      <h1 className="font-display text-title-m md:text-title-d">My Admissions</h1>

      {orders.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No orders yet"
            description="Get help preparing and submitting school application forms."
            nextStepLabel="Get help applying"
            nextStepHref={`${localePrefix(locale)}/admissions/help`}
          />
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-6">
          {orders.map((order) => {
            const child = childById.get(order.child_id);
            const orderApps = applicationsByOrder.get(order.id) ?? [];

            return (
              <div key={order.id} className="flex flex-col gap-3">
                <p className="text-meta font-semibold text-muted-ink">
                  {child?.first_name ?? "Child"} · {formatCurrency(order.amount_inr)}
                </p>

                {order.status === "awaiting_payment" ? (
                  <div className="rounded-md border border-rule bg-copy-white p-4">
                    <p className="text-body">Waiting for payment confirmation.</p>
                    <Link
                      href={`${localePrefix(locale)}/admissions/help/checkout?order=${order.id}`}
                      className="mt-2 inline-block font-semibold text-ruled-blue"
                    >
                      Go to checkout
                    </Link>
                  </div>
                ) : !order.intake ? (
                  <div className="rounded-md border border-rule bg-copy-white p-4">
                    <p className="text-body">
                      Payment received. Share your child's details to continue.
                    </p>
                    <Link
                      href={`${localePrefix(locale)}/my/admissions/${order.id}/details`}
                      className="mt-2 inline-block font-semibold text-ruled-blue"
                    >
                      Continue
                    </Link>
                  </div>
                ) : orderApps.length === 0 ? (
                  <div className="rounded-md border border-rule bg-copy-white p-4">
                    <p className="text-body">
                      We're getting started on your applications. You'll see them here once we're
                      preparing forms.
                    </p>
                  </div>
                ) : (
                  orderApps.map((app) => (
                    <ApplicationStatusRow
                      key={app.id}
                      tone={toneFor(app.status)}
                      schoolName={schoolNameById.get(app.school_id) ?? "School"}
                      statusLabel={STATUS_LABEL[app.status]}
                      description={
                        app.school_application_no
                          ? `Application no. ${app.school_application_no}`
                          : app.next_action
                            ? `${app.next_action}${app.next_action_due ? ` by ${new Date(app.next_action_due).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}`
                            : "We're working on this application."
                      }
                      actionSlot={
                        app.status === "awaiting_parent_approval" ? (
                          <form action={approveApplication}>
                            <input type="hidden" name="locale" value={locale} />
                            <input type="hidden" name="applicationId" value={app.id} />
                            <button
                              type="submit"
                              className="flex h-11 w-fit items-center rounded-md bg-ruled-blue px-4 text-meta font-semibold text-copy-white"
                            >
                              Review and approve
                            </button>
                          </form>
                        ) : undefined
                      }
                    />
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
