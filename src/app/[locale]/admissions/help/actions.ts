"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { nextAcademicYear } from "@/lib/age";
import { createSessionClient, getSessionUser } from "@/lib/db/session";
import { getPaymentProvider } from "@/lib/payments/provider";
import { localePrefix } from "@/lib/urls";

const CHILD_PROFILE_NOTICE_VERSION = "child-profile-2026-09";

const addChildSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  dateOfBirth: z.string().min(1),
  targetClass: z.string().optional(),
});

export async function addChild(formData: FormData) {
  const locale = String(formData.get("locale") ?? "en");
  const parsed = addChildSchema.safeParse({
    firstName: formData.get("firstName"),
    dateOfBirth: formData.get("dateOfBirth"),
    targetClass: formData.get("targetClass") || undefined,
  });

  if (!parsed.success) {
    redirect(`${localePrefix(locale)}/admissions/help/package?error=invalid_child`);
  }

  const supabase = await createSessionClient();
  const user = await getSessionUser(supabase);
  if (!user) {
    redirect(
      `${localePrefix(locale)}/sign-in?next=${encodeURIComponent(`${localePrefix(locale)}/admissions/help/package`)}`,
    );
  }

  const { data: child, error } = await supabase
    .from("children")
    .insert({
      parent_id: user.id,
      first_name: parsed.data.firstName,
      date_of_birth: parsed.data.dateOfBirth,
      target_class: parsed.data.targetClass ?? null,
      target_year: String(nextAcademicYear(new Date())),
    })
    .select("id")
    .single();

  if (error || !child) {
    redirect(`${localePrefix(locale)}/admissions/help/package?error=invalid_child`);
  }

  await supabase.from("consents").insert({
    user_id: user.id,
    phone: user.phone ?? null,
    purpose: "child_profile",
    notice_version: CHILD_PROFILE_NOTICE_VERSION,
    channel: "app",
  });

  redirect(`${localePrefix(locale)}/admissions/help/package?child=${child.id}`);
}

const checkoutSchema = z.object({
  childId: z.string().min(1),
  productCode: z.string().min(1),
});

export async function startCheckout(formData: FormData) {
  const locale = String(formData.get("locale") ?? "en");
  const parsed = checkoutSchema.safeParse({
    childId: formData.get("childId"),
    productCode: formData.get("productCode"),
  });

  if (!parsed.success) {
    redirect(`${localePrefix(locale)}/admissions/help/package?error=invalid_selection`);
  }

  const supabase = await createSessionClient();
  const user = await getSessionUser(supabase);
  if (!user) {
    redirect(
      `${localePrefix(locale)}/sign-in?next=${encodeURIComponent(`${localePrefix(locale)}/admissions/help/package`)}`,
    );
  }

  const { data: orderId, error } = await supabase.rpc("create_application_order", {
    p_product_code: parsed.data.productCode,
    p_child_id: parsed.data.childId,
  });

  if (error || !orderId) {
    redirect(`${localePrefix(locale)}/admissions/help/package?error=order_failed`);
  }

  redirect(`${localePrefix(locale)}/admissions/help/checkout?order=${orderId}`);
}

export async function payForOrder(formData: FormData) {
  const locale = String(formData.get("locale") ?? "en");
  const orderId = String(formData.get("orderId") ?? "");
  const amountInr = Number(formData.get("amountInr") ?? 0);
  const productName = String(formData.get("productName") ?? "Application help");

  const provider = getPaymentProvider();
  const { redirectTo } = await provider.createOrder(
    { id: orderId, amountInr, productName },
    locale,
  );
  redirect(redirectTo);
}
