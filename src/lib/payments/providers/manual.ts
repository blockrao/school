import "server-only";
import type { PaymentProvider } from "@/lib/payments/provider";

/**
 * Production default. Doesn't take payment details itself — the order sits at
 * awaiting_payment and staff confirm it from the /ops mark-paid screen once
 * payment has actually been received by whatever means (bank transfer, UPI
 * collect request, etc., outside this repo's scope). No webhook — confirmation
 * is a staff action gated by is_staff(), see src/app/ops/orders/actions.ts.
 */
export const manualProvider: PaymentProvider = {
  name: "manual",
  async createOrder(order, locale) {
    return { redirectTo: `/${locale}/admissions/help/checkout/confirm?order=${order.id}` };
  },
  async verifyWebhook() {
    return null;
  },
};
