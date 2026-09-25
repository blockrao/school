"use server";

import { createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSessionClient } from "@/lib/db/session";

const DOCUMENT_STORAGE_NOTICE_VERSION = "document-storage-2026-09";
const DOCUMENT_RETENTION_MONTHS = 12;

const intakeSchema = z.object({
  gender: z.enum(["boy", "girl", "other"]).optional(),
  parentName: z.string().trim().max(120).optional(),
  address: z.string().trim().max(500).optional(),
  sibling: z.string().trim().max(200).optional(),
  category: z.enum(["general", "ews", "dg"]).default("general"),
});

export async function saveOrderIntake(formData: FormData) {
  const locale = String(formData.get("locale") ?? "en");
  const orderId = String(formData.get("orderId") ?? "");

  const parsed = intakeSchema.safeParse({
    gender: formData.get("gender") || undefined,
    parentName: formData.get("parentName") || undefined,
    address: formData.get("address") || undefined,
    sibling: formData.get("sibling") || undefined,
    category: formData.get("category") || undefined,
  });

  if (!parsed.success) {
    redirect(`/${locale}/my/admissions/${orderId}/details?error=invalid`);
  }

  const supabase = await createSessionClient();
  const { error } = await supabase.rpc("save_order_intake", {
    p_order_id: orderId,
    p_intake: parsed.data,
  });

  if (error) {
    redirect(`/${locale}/my/admissions/${orderId}/details?error=save_failed`);
  }

  redirect(`/${locale}/my/admissions/${orderId}/documents`);
}

function retainUntil(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + DOCUMENT_RETENTION_MONTHS);
  return d.toISOString().slice(0, 10);
}

const uploadSchema = z.object({
  orderId: z.string().min(1),
  childId: z.string().min(1),
  kind: z.enum(["birth_certificate", "address_proof", "photo_child", "aadhaar_masked", "other"]),
});

export async function uploadDocument(formData: FormData) {
  const locale = String(formData.get("locale") ?? "en");
  const orderId = String(formData.get("orderId") ?? "");
  const file = formData.get("file");

  const parsed = uploadSchema.safeParse({
    orderId,
    childId: formData.get("childId"),
    kind: formData.get("kind"),
  });

  if (!parsed.success || !(file instanceof File) || file.size === 0) {
    redirect(`/${locale}/my/admissions/${orderId}/documents?error=invalid`);
  }

  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(
      `/${locale}/sign-in?next=${encodeURIComponent(`/${locale}/my/admissions/${orderId}/documents`)}`,
    );
  }

  const bytes = new Uint8Array(await (file as File).arrayBuffer());
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const docId = crypto.randomUUID();
  const ext = (file as File).name.split(".").pop() ?? "bin";
  const storagePath = `${user.id}/${parsed.data.childId}/${docId}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(storagePath, bytes, { contentType: (file as File).type || "application/octet-stream" });

  if (uploadError) {
    redirect(`/${locale}/my/admissions/${orderId}/documents?error=upload_failed`);
  }

  const { error: insertError } = await supabase.from("documents").insert({
    id: docId,
    child_id: parsed.data.childId,
    kind: parsed.data.kind,
    storage_path: storagePath,
    sha256,
    retain_until: retainUntil(),
  });

  if (insertError) {
    await supabase.storage.from("documents").remove([storagePath]);
    redirect(`/${locale}/my/admissions/${orderId}/documents?error=upload_failed`);
  }

  await supabase.from("consents").insert({
    user_id: user.id,
    phone: user.phone ?? null,
    purpose: "document_storage",
    notice_version: DOCUMENT_STORAGE_NOTICE_VERSION,
    channel: "app",
  });

  redirect(`/${locale}/my/admissions/${orderId}/documents`);
}

export async function deleteDocument(formData: FormData) {
  const locale = String(formData.get("locale") ?? "en");
  const orderId = String(formData.get("orderId") ?? "");
  const docId = String(formData.get("docId") ?? "");
  const storagePath = String(formData.get("storagePath") ?? "");

  const supabase = await createSessionClient();
  await supabase.storage.from("documents").remove([storagePath]);
  await supabase.from("documents").delete().eq("id", docId);

  redirect(`/${locale}/my/admissions/${orderId}/documents`);
}
