import "server-only";
import { createSessionClient, getSessionUser } from "@/lib/db/session";

export type Child = {
  id: string;
  first_name: string;
  date_of_birth: string;
  target_year: string | null;
  target_class: string | null;
};

export type Product = {
  code: string;
  name: string;
  price_inr: number;
  gst_rate: number;
};

export type OrderIntake = {
  gender?: string;
  parent_name?: string;
  address?: string;
  sibling?: string;
  category?: "general" | "ews" | "dg";
};

export type Order = {
  id: string;
  child_id: string;
  product_code: string;
  amount_inr: number;
  status:
    | "draft"
    | "awaiting_payment"
    | "paid"
    | "in_progress"
    | "completed"
    | "cancelled"
    | "refunded";
  payment_ref: string | null;
  intake: OrderIntake | null;
  created_at: string;
};

export type Application = {
  id: string;
  order_id: string | null;
  school_id: string;
  status:
    | "not_started"
    | "preparing"
    | "awaiting_parent_approval"
    | "submitted"
    | "fee_pending"
    | "interview_scheduled"
    | "result_selected"
    | "result_waitlisted"
    | "result_not_selected"
    | "withdrawn";
  school_application_no: string | null;
  next_action: string | null;
  next_action_due: string | null;
  parent_approved_at: string | null;
};

export async function listMyChildren(): Promise<Child[]> {
  const supabase = await createSessionClient();
  const user = await getSessionUser(supabase);
  if (!user) return [];

  const { data } = await supabase
    .from("children")
    .select("id, first_name, date_of_birth, target_year, target_class")
    .eq("parent_id", user.id)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function listApplicationHelpProducts(): Promise<Product[]> {
  const supabase = await createSessionClient();
  const { data } = await supabase
    .from("products")
    .select("code, name, price_inr, gst_rate")
    .like("code", "help_%")
    .eq("active", true)
    .order("price_inr", { ascending: true });
  return data ?? [];
}

export async function getProductByCode(code: string): Promise<Product | null> {
  const supabase = await createSessionClient();
  const { data } = await supabase
    .from("products")
    .select("code, name, price_inr, gst_rate")
    .eq("code", code)
    .maybeSingle();
  return data ?? null;
}

export async function getMyOrder(orderId: string): Promise<Order | null> {
  const supabase = await createSessionClient();
  const user = await getSessionUser(supabase);
  if (!user) return null;

  const { data } = await supabase
    .from("application_orders")
    .select("id, child_id, product_code, amount_inr, status, payment_ref, intake, created_at")
    .eq("id", orderId)
    .eq("user_id", user.id)
    .maybeSingle();
  return (data as Order | null) ?? null;
}

export async function listMyOrders(): Promise<Order[]> {
  const supabase = await createSessionClient();
  const user = await getSessionUser(supabase);
  if (!user) return [];

  const { data } = await supabase
    .from("application_orders")
    .select("id, child_id, product_code, amount_inr, status, payment_ref, intake, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  return (data as Order[] | null) ?? [];
}

export type ChildDocument = {
  id: string;
  kind: string;
  storage_path: string;
  uploaded_at: string;
};

export async function listDocumentsForChild(childId: string): Promise<ChildDocument[]> {
  const supabase = await createSessionClient();
  const { data } = await supabase
    .from("documents")
    .select("id, kind, storage_path, uploaded_at")
    .eq("child_id", childId)
    .is("deleted_at", null);
  return data ?? [];
}

export type StaffOrder = {
  id: string;
  amount_inr: number;
  product_code: string;
  created_at: string;
  child_name: string;
};

/** Relies on orders_owner's `is_staff()` branch — caller must already be staff for RLS to return anything. */
export async function listAwaitingPaymentOrdersForStaff(): Promise<StaffOrder[]> {
  const supabase = await createSessionClient();
  const { data: orders } = await supabase
    .from("application_orders")
    .select("id, child_id, amount_inr, product_code, created_at")
    .eq("status", "awaiting_payment")
    .order("created_at", { ascending: true });
  if (!orders || orders.length === 0) return [];

  const { data: children } = await supabase
    .from("children")
    .select("id, first_name")
    .in(
      "id",
      orders.map((o) => o.child_id),
    );
  const nameById = new Map((children ?? []).map((c) => [c.id, c.first_name]));

  return orders.map((o) => ({
    id: o.id,
    amount_inr: o.amount_inr,
    product_code: o.product_code,
    created_at: o.created_at,
    child_name: nameById.get(o.child_id) ?? "Unknown",
  }));
}

export async function listApplicationsForOrders(orderIds: string[]): Promise<Application[]> {
  if (orderIds.length === 0) return [];
  const supabase = await createSessionClient();
  const { data } = await supabase
    .from("applications")
    .select(
      "id, order_id, school_id, status, school_application_no, next_action, next_action_due, parent_approved_at",
    )
    .in("order_id", orderIds);
  return (data as Application[] | null) ?? [];
}
