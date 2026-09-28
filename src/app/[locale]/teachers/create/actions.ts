"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSessionClient, getSessionUser } from "@/lib/db/session";
import { slugify } from "@/lib/slug";
import { localePrefix } from "@/lib/urls";

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
  const path = `${localePrefix(locale)}/teachers/create`;

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
  const user = await getSessionUser(supabase);
  if (!user) {
    redirect(`${localePrefix(locale)}/sign-in?next=${encodeURIComponent(path)}`);
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

  // teachers.slug ({name}-{teacher_code}) and the permanent teacher_code are set by the
  // database on registration (D-125); read the slug back rather than building it here.
  let teacherSlug: string | undefined;
  let isNew = false;

  if (existing) {
    const { data: updated } = await supabase
      .from("teachers")
      .update(row)
      .eq("id", existing.id)
      .select("slug")
      .single();
    teacherSlug = updated?.slug ?? existing.slug;
  } else {
    const { data: created, error } = await supabase
      .from("teachers")
      .insert({
        ...row,
        claimed_by: user.id,
        slug: slugify(parsed.data.fullName) || "teacher",
        status: "published",
        is_listed: true,
      })
      .select("slug")
      .single();
    if (error || !created) {
      redirect(`${path}?error=save_failed`);
    }
    teacherSlug = created.slug;
    isNew = true;
  }

  redirect(`${localePrefix(locale)}/teacher/${teacherSlug}/manage${isNew ? "?welcome=1" : ""}`);
}
