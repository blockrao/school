"use server";

import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/db/ops";
import type { Database } from "@/lib/db/types";

type SchoolUpdate = Database["public"]["Tables"]["schools"]["Update"];
type Management = NonNullable<SchoolUpdate["management"]>;
type Gender = NonNullable<SchoolUpdate["gender"]>;
type Tier = NonNullable<SchoolUpdate["tier"]>;
type Status = NonNullable<SchoolUpdate["status"]>;
type Verification = NonNullable<SchoolUpdate["verification"]>;
type Claim = NonNullable<SchoolUpdate["claim"]>;
type VerificationStatus = NonNullable<SchoolUpdate["verification_status"]>;

// Verification is an assessment of whether a record has been checked;
// source_type records where the information came from. These are independent
// dimensions: editing verification must not overwrite source attribution
// (e.g. official UDISE/state data must not become user_submitted).
const VERIFICATION_TO_STATUS: Record<Verification, VerificationStatus> = {
  unverified: "unknown",
  source_verified: "verified",
  ops_verified: "verified",
  school_verified: "verified",
};

function enumOrNull<T extends string>(value: FormDataEntryValue | null): T | null {
  const text = String(value ?? "").trim();
  return (text || null) as T | null;
}

function splitList(value: FormDataEntryValue | null): string[] {
  const text = String(value ?? "").trim();
  if (!text) return [];
  return text
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function textOrNull(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? "").trim();
  return text || null;
}

export async function updateSchool(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing school id");

  const { supabase } = await requireStaff();

  const establishedYearRaw = String(formData.get("established_year") ?? "").trim();

  const verification = String(formData.get("verification") ?? "unverified") as Verification;
  const patch: SchoolUpdate = {
    name_en: String(formData.get("name_en") ?? "").trim(),
    name_hi: textOrNull(formData.get("name_hi")),
    management: enumOrNull<Management>(formData.get("management")),
    gender: enumOrNull<Gender>(formData.get("gender")),
    medium: splitList(formData.get("medium")),
    min_class: textOrNull(formData.get("min_class")),
    max_class: textOrNull(formData.get("max_class")),
    established_year: establishedYearRaw ? Number(establishedYearRaw) : null,
    tier: String(formData.get("tier") ?? "B") as Tier,
    address: textOrNull(formData.get("address")),
    pincode: textOrNull(formData.get("pincode")),
    website: textOrNull(formData.get("website")),
    phone: splitList(formData.get("phone")),
    email: splitList(formData.get("email")),
    about_en: textOrNull(formData.get("about_en")),
    about_hi: textOrNull(formData.get("about_hi")),
    status: String(formData.get("status") ?? "draft") as Status,
    verification,
    verification_status: VERIFICATION_TO_STATUS[verification],
    claim: String(formData.get("claim") ?? "unclaimed") as Claim,
  };

  if (formData.get("markVerifiedNow") === "1") {
    patch.last_verified_at = new Date().toISOString();
    const nextCheck = new Date();
    nextCheck.setDate(nextCheck.getDate() + 90);
    patch.next_check_due = nextCheck.toISOString().slice(0, 10);
  }

  const { error } = await supabase.from("schools").update(patch).eq("id", id);
  if (error) throw new Error(`Couldn't save: ${error.message}`);

  redirect(`/ops/schools/${id}`);
}
