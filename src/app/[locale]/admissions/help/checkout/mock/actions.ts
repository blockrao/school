"use server";

import { redirect } from "next/navigation";
import { getMyOrder } from "@/lib/db/application-help";
import { markOrderPaid } from "@/lib/db/payments-role";
import { serverEnv } from "@/lib/env.server";
import { localePrefix } from "@/lib/urls";

export async function simulatePayment(formData: FormData) {
  const locale = String(formData.get("locale") ?? "en");
  const orderId = String(formData.get("orderId") ?? "");
  const result = formData.get("result") === "success" ? "success" : "failure";

  // Defense in depth — env.server.ts already refuses to boot with
  // PAYMENT_PROVIDER=mock in production, but this endpoint is only ever safe to
  // reach at all under those same conditions.
  if (serverEnv.PAYMENT_PROVIDER !== "mock" || serverEnv.VERCEL_ENV === "production") {
    redirect(`${localePrefix(locale)}/admissions/help/package`);
  }

  const order = await getMyOrder(orderId);
  if (!order) {
    redirect(`${localePrefix(locale)}/admissions/help/package`);
  }

  if (result === "failure") {
    redirect(
      `${localePrefix(locale)}/admissions/help/checkout/mock?order=${orderId}&result=failed`,
    );
  }

  await markOrderPaid(orderId, `mock_${orderId}`);
  redirect(`${localePrefix(locale)}/my/admissions/${orderId}/details`);
}
