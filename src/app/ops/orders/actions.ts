"use server";

import { redirect } from "next/navigation";
import { markOrderPaid } from "@/lib/db/payments-role";
import { createSessionClient, getSessionUser } from "@/lib/db/session";

export async function markOrderPaidByStaff(formData: FormData) {
  const orderId = String(formData.get("orderId") ?? "");

  const supabase = await createSessionClient();
  const user = await getSessionUser(supabase);
  if (!user) redirect("/en/sign-in?next=%2Fops%2Forders");

  const { data: isStaff } = await supabase.rpc("is_staff");
  if (!isStaff) redirect("/en");

  await markOrderPaid(orderId, `manual_${orderId}`);

  redirect("/ops/orders");
}
