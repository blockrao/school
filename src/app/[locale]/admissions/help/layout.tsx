import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ADMISSIONS_HELP_ENABLED } from "@/lib/features";

/** The paid-help flow is switched off until real payments exist (see lib/features.ts). */
export default function AdmissionsHelpLayout({ children }: { children: ReactNode }) {
  if (!ADMISSIONS_HELP_ENABLED) notFound();
  return children;
}
