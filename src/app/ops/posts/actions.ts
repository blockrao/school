"use server";

import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/db/ops";

export async function approvePost(formData: FormData) {
  const postId = String(formData.get("postId") ?? "");
  const supabase = await requireStaff();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase
    .from("school_posts")
    .update({
      review: "approved",
      reviewed_by: user?.id,
      reviewed_at: new Date().toISOString(),
      published_at: new Date().toISOString(),
    })
    .eq("id", postId);

  redirect("/ops/posts");
}

export async function rejectPost(formData: FormData) {
  const postId = String(formData.get("postId") ?? "");
  const supabase = await requireStaff();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase
    .from("school_posts")
    .update({ review: "rejected", reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
    .eq("id", postId);

  redirect("/ops/posts");
}
