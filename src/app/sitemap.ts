import type { MetadataRoute } from "next";
import { getSupabaseAdmin } from "@/lib/supabase";

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ??
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = getSupabaseAdmin();

  const { data: protocols } = await supabase
    .from("protocols")
    .select("slug, updated_at")
    .order("rank", { ascending: true, nullsFirst: false });

  const protocolEntries: MetadataRoute.Sitemap = (protocols ?? []).map((p) => ({
    url: `${BASE_URL}/${p.slug}`,
    lastModified: p.updated_at ?? undefined,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  return [
    {
      url: BASE_URL,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${BASE_URL}/leaderboard`,
      changeFrequency: "hourly",
      priority: 0.8,
    },
    ...protocolEntries,
  ];
}
