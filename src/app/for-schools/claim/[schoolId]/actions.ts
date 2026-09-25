"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { listPublicSchoolsByIds } from "@/lib/db/public-adapter";
import { createSessionClient } from "@/lib/db/session";
import type { Json } from "@/lib/db/types";

const claimSchema = z.object({
  schoolId: z.string().min(1),
  method: z.enum(["official_email", "phone_on_record", "document"]),
  value: z.string().optional(),
});

export async function submitClaim(formData: FormData) {
  const schoolId = String(formData.get("schoolId") ?? "");
  const claimPath = `/for-schools/claim/${schoolId}`;

  const parsed = claimSchema.safeParse({
    schoolId,
    method: formData.get("method"),
    value: formData.get("value") || undefined,
  });
  if (!parsed.success) {
    redirect(`${claimPath}?error=invalid`);
  }

  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/en/sign-in?next=${encodeURIComponent(claimPath)}`);
  }

  const school = (await listPublicSchoolsByIds([schoolId])).at(0);
  if (!school) {
    redirect("/for-schools/claim");
  }

  let evidence: Json;

  if (parsed.data.method === "document") {
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      redirect(`${claimPath}?error=missing_file`);
    }
    const bytes = new Uint8Array(await (file as File).arrayBuffer());
    const claimIdForPath = crypto.randomUUID();
    const ext = (file as File).name.split(".").pop() ?? "bin";
    const storagePath = `${user.id}/${claimIdForPath}/letter.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("school-claims")
      .upload(storagePath, bytes, {
        contentType: (file as File).type || "application/octet-stream",
      });
    if (uploadError) {
      redirect(`${claimPath}?error=upload_failed`);
    }
    evidence = { method: "document", storage_path: storagePath };
  } else {
    const typedValue = (parsed.data.value ?? "").trim();
    const onRecord =
      parsed.data.method === "official_email" ? (school.email ?? []) : (school.phone ?? []);

    const matched =
      parsed.data.method === "official_email"
        ? onRecord.some((e) => e.trim().toLowerCase() === typedValue.toLowerCase())
        : onRecord.some((p) => p.replace(/\D/g, "").endsWith(typedValue.replace(/\D/g, "")));

    evidence = { method: parsed.data.method, claimed_value: typedValue, matched };
  }

  const { error } = await supabase.from("school_claims").insert({
    school_id: schoolId,
    user_id: user.id,
    method: parsed.data.method,
    evidence,
  });

  if (error) {
    redirect(`${claimPath}?error=submit_failed`);
  }

  redirect(`${claimPath}/pending`);
}
