import { siteUrl } from "@/lib/env.server";
import { lp } from "@/lib/urls";
import { legacyEntityTarget } from "../../../_views/resolve";

/** Legacy /{city}/{slug}-{code}/index.md → /school/{slug}/index.md (one 301, D-121 §8). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string; city: string; entitySlug: string }> },
) {
  const { locale, city, entitySlug } = await params;
  const target = await legacyEntityTarget(city, entitySlug);
  if (!target?.startsWith("/school/")) return new Response("Not found", { status: 404 });
  return Response.redirect(`${siteUrl}${lp(locale, target)}/index.md`, 301);
}
