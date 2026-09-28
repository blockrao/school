import "server-only";
import type { PaymentProvider } from "@/lib/payments/provider";
import { localePrefix } from "@/lib/urls";

/**
 * Dev/preview only — never selectable in production (enforced in src/lib/env.server.ts,
 * and the mock checkout route itself re-checks before rendering). Confirmation happens
 * via a direct "Simulate success" Server Action on the mock checkout page, not a real
 * webhook, so verifyWebhook is unused here.
 */
export const mockProvider: PaymentProvider = {
  name: "mock",
  async createOrder(order, locale) {
    return {
      redirectTo: `${localePrefix(locale)}/admissions/help/checkout/mock?order=${order.id}`,
    };
  },
  async verifyWebhook() {
    return null;
  },
};
