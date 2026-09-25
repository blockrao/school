"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSessionClient } from "@/lib/db/session";
import { slugify } from "@/lib/slug";

const OPEN_TO_OPTIONS = ["Tutoring", "Online classes", "Teacher workshops"] as const;

const profileSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  subject: z.string().trim().min(1).max(60),
  level: z.enum(["PRT", "TGT", "PGT"]),
  primarySchoolId: z.string().optional(),
  localityId: z.string().optional(),
  headline: z.string().trim().max(200).optional(),
  about: z.string().trim().max(2000).optional(),
  yearsTeaching: z.string().optional(),
});

export async function saveTeacherProfile(formData: FormData) {
  const locale = String(formData.get("locale") ?? "en");
  const path = `/${locale}/teachers/create`;

  const parsed = profileSchema.safeParse({
    fullName: formData.get("fullName"),
    subject: formData.get("subject"),
    level: formData.get("level"),
    primarySchoolId: formData.get("primarySchoolId") || undefined,
    localityId: formData.get("localityId") || undefined,
    headline: formData.get("headline") || undefined,
    about: formData.get("about") || undefined,
    yearsTeaching: formData.get("yearsTeaching") || undefined,
  });
  if (!parsed.success) {
    redirect(`${path}?error=invalid`);
  }

  const openTo = OPEN_TO_OPTIONS.filter((o) => formData.get(`openTo_${o}`) === "on");

  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/${locale}/sign-in?next=${encodeURIComponent(path)}`);
  }

  const { data: existing } = await supabase
    .from("teachers")
    .select("id, slug")
    .eq("claimed_by", user.id)
    .maybeSingle();

  const row = {
    full_name: parsed.data.fullName,
    subject: parsed.data.subject,
    level: parsed.data.level,
    primary_school_id: parsed.data.primarySchoolId || null,
    locality_id: parsed.data.localityId ? Number(parsed.data.localityId) : null,
    headline: parsed.data.headline ?? null,
    about: parsed.data.about ?? null,
    years_teaching: parsed.data.yearsTeaching ? Number(parsed.data.yearsTeaching) : null,
    open_to: openTo,
  };

  let idSlug: string | undefined;

  if (existing) {
    await supabase.from("teachers").update(row).eq("id", existing.id);
    idSlug = `${existing.id}-${existing.slug}`;
  } else {
    const slug = slugify(parsed.data.fullName);
    const { data: created, error } = await supabase
      .from("teachers")
      .insert({
        ...row,
        claimed_by: user.id,
        slug,
        status: "published",
        is_listed: true,
      })
      .select("id")
      .single();
    if (error || !created) {
      redirect(`${path}?error=save_failed`);
    }
    idSlug = created ? `${created.id}-${slug}` : undefined;
  }

  redirect(`/${locale}/teacher/${idSlug}/manage`);
}
