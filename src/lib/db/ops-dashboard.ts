import "server-only";
import { createSessionClient } from "@/lib/db/session";

export type OpsCounts = {
  schoolsUnverified: number;
  localities: number;
  claims: number;
  notices: number;
  seats: number;
  corrections: number;
  myOpenTasks: number;
  openTasks: number;
};

/**
 * One count per queue on the ops home page, so staff can see what actually
 * needs attention without opening each queue in turn. Each count mirrors that
 * queue's own page query exactly (see each src/app/ops/<queue>/page.tsx) — if a queue's
 * definition of "pending" changes, update both places.
 */
export async function getOpsCounts(): Promise<OpsCounts> {
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    schoolsUnverified,
    localities,
    claims,
    notices,
    seats,
    corrections,
    openTasks,
    myOpenTasks,
  ] = await Promise.all([
    supabase
      .from("schools")
      .select("id", { count: "exact", head: true })
      .eq("verification", "unverified")
      .neq("status", "hidden"),
    supabase.from("schools").select("id", { count: "exact", head: true }).is("locality_id", null),
    supabase
      .from("school_claims")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("admission_notices")
      .select("id", { count: "exact", head: true })
      .eq("review", "pending"),
    supabase
      .from("seat_status")
      .select("id", { count: "exact", head: true })
      .is("confirmed_at", null),
    supabase
      .from("correction_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "open"),
    supabase
      .from("ops_tasks")
      .select("id", { count: "exact", head: true })
      .in("status", ["open", "in_progress"]),
    user
      ? supabase
          .from("ops_tasks")
          .select("id", { count: "exact", head: true })
          .eq("assignee", user.id)
          .in("status", ["open", "in_progress"])
      : Promise.resolve({ count: 0 }),
  ]);

  return {
    schoolsUnverified: schoolsUnverified.count ?? 0,
    localities: localities.count ?? 0,
    claims: claims.count ?? 0,
    notices: notices.count ?? 0,
    seats: seats.count ?? 0,
    corrections: corrections.count ?? 0,
    openTasks: openTasks.count ?? 0,
    myOpenTasks: myOpenTasks.count ?? 0,
  };
}

export type StaffMember = {
  userId: string;
  email: string | null;
  fullName: string | null;
  role: "ops" | "admin";
};

/** Every profile with staff access — for the tasks assignee picker and /ops/staff. */
export async function listStaff(): Promise<StaffMember[]> {
  const supabase = await createSessionClient();
  const { data } = await supabase
    .from("profiles")
    .select("user_id, email, full_name, role")
    .in("role", ["ops", "admin"])
    .order("email", { ascending: true });

  return (data ?? []).map((p) => ({
    userId: p.user_id,
    email: p.email,
    fullName: p.full_name,
    role: p.role as "ops" | "admin",
  }));
}
