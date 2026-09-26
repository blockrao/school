"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/db/ops";
import type { Database } from "@/lib/db/types";

type TaskType = Database["public"]["Enums"]["task_type"];
type TaskStatus = Database["public"]["Enums"]["task_status"];

export async function updateTaskStatus(formData: FormData) {
  const taskId = String(formData.get("taskId") ?? "");
  const status = String(formData.get("status") ?? "") as TaskStatus;
  const outcome = formData.get("outcome");

  const { supabase } = await requireStaff();
  await supabase
    .from("ops_tasks")
    .update({
      status,
      outcome: outcome ? String(outcome) : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId);

  revalidatePath("/ops/tasks");
}

export async function assignTask(formData: FormData) {
  const taskId = String(formData.get("taskId") ?? "");
  const assignee = String(formData.get("assignee") ?? "");

  const { supabase } = await requireStaff();
  await supabase
    .from("ops_tasks")
    .update({ assignee: assignee || null, updated_at: new Date().toISOString() })
    .eq("id", taskId);

  revalidatePath("/ops/tasks");
}

export async function claimTask(formData: FormData) {
  const taskId = String(formData.get("taskId") ?? "");

  const { supabase, user } = await requireStaff();

  await supabase
    .from("ops_tasks")
    .update({
      assignee: user?.id,
      status: "in_progress",
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId);

  revalidatePath("/ops/tasks");
}

export async function createTask(formData: FormData) {
  const kind = String(formData.get("kind") ?? "") as TaskType;
  const schoolId = String(formData.get("schoolId") ?? "");
  const priority = Number(formData.get("priority") ?? 3);
  const dueAt = String(formData.get("dueAt") ?? "");
  const note = String(formData.get("note") ?? "");

  if (!kind) return;

  const { supabase } = await requireStaff();
  await supabase.from("ops_tasks").insert({
    kind,
    school_id: schoolId || null,
    priority,
    due_at: dueAt || null,
    payload: note ? { note } : null,
  });

  revalidatePath("/ops/tasks");
}
