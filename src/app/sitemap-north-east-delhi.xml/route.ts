import { buildCitySitemapResponse } from "@/lib/sitemap";

export async function GET() {
  return buildCitySitemapResponse("north-east-delhi");
}
