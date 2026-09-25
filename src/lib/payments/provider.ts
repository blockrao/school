import "server-only";
import { serverEnv } from "@/lib/env.server";
import { manualProvider } from "@/lib/payments/providers/manual";
import { mockProvider } from "@/lib/payments/providers/mock";

export type CheckoutOrder = {
  id: string;
  amountInr: number;
  productName: string;
};

export interface PaymentProvider {
  name: "mock" | "manual" | "razorpay";
  /** Called right after the local order row exists (status = awaiting_payment). Returns where to send the browser next. */
  createOrder(order: CheckoutOrder, locale: string): Promise<{ redirectTo: string }>;
  /**
   * Verifies an inbound webhook/callback is authentic for this provider and extracts
   * what's needed to mark the order paid. mock and manual never receive a real
   * external webhook (see their own files for how each actually confirms payment),
   * so both just return null — this slot exists for razorpay (added later, once
   * keys exist) to implement signature verification without any other code changing.
   */
  verifyWebhook(request: Request): Promise<{ orderId: string; paymentRef: string } | null>;
}

export function getPaymentProvider(): PaymentProvider {
  switch (serverEnv.PAYMENT_PROVIDER) {
    case "mock":
      return mockProvider;
    case "manual":
      return manualProvider;
    case "razorpay":
      throw new Error("PAYMENT_PROVIDER=razorpay is not implemented yet.");
  }
}
