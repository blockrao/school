import { buildCitySitemapResponse } from "@/lib/sitemap";

export async function GET() {
  return buildCitySitemapResponse("delhi");
}
