import { buildCitySitemapResponse } from "@/lib/sitemap";

export async function GET() {
  return buildCitySitemapResponse("north-west-delhi");
}
