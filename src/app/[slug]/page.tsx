import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase";
import { formatTvl } from "@/lib/api/utils";

export const revalidate = 3600;

interface Props {
  params: Promise<{ slug: string }>;
}

const getProtocol = cache(async (slug: string) => {
  const sb = getSupabaseAdmin();
  const { data } = await sb
    .from("protocols")
    .select("*")
    .eq("slug", slug.toLowerCase())
    .single();
  return data;
});

const getCategoryPeers = cache(async (category: string, excludeSlug: string) => {
  const sb = getSupabaseAdmin();
  const { data } = await sb
    .from("protocols")
    .select("slug, name, tvl, logo_url, rank")
    .eq("category", category)
    .neq("slug", excludeSlug)
    .order("tvl", { ascending: false })
    .limit(5);
  return data ?? [];
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const proto = await getProtocol(slug);

  if (!proto) {
    return { title: "Protocol Not Found - Sol City" };
  }

  const title = `${proto.name} - Sol City | ${formatTvl(proto.tvl)} TVL`;
  const description = `See ${proto.name}'s building in Sol City. ${formatTvl(proto.tvl)} TVL, ${proto.category} protocol on Solana. Rank #${proto.rank ?? "?"} in the city.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function ProtocolPage({ params }: Props) {
  const { slug } = await params;
  const proto = await getProtocol(slug);

  if (!proto) notFound();

  const peers = await getCategoryPeers(proto.category, proto.slug);

  const change = proto.change_24h;
  const changeColor = change != null ? (change >= 0 ? "#14F195" : "#f85149") : "#888";
  const changeStr = change != null ? `${change >= 0 ? "+" : ""}${change.toFixed(2)}%` : "N/A";

  return (
    <div className="min-h-screen bg-bg text-cream">
      {/* Header */}
      <div className="border-b-[3px] border-border bg-bg-raised/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link href="/" className="text-sm hover:text-white transition-colors">
            &larr; Sol <span className="text-[#6090e0]">City</span>
          </Link>
          <a
            href={proto.token_mint ? `https://solscan.io/token/${proto.token_mint}` : `https://defillama.com/protocol/${proto.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-muted transition-colors hover:text-cream"
          >
            View on {proto.token_mint ? "Solscan" : "DeFiLlama"} &rarr;
          </a>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-6">
        {/* Protocol header */}
        <div className="flex items-center gap-4 mb-6">
          {proto.logo_url && (
            <Image
              src={proto.logo_url}
              alt={proto.name}
              width={56}
              height={56}
              className="border-[3px] border-border flex-shrink-0"
              style={{ imageRendering: "pixelated" }}
            />
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-xl text-cream">{proto.name}</h1>
            <p className="text-[10px] text-muted mt-0.5">
              {proto.category} &middot; Rank #{proto.rank ?? "?"}
              {proto.claimed && (
                <span className="ml-2 inline-block bg-[#6090e0] px-1.5 py-0.5 text-[7px] text-bg">
                  Claimed
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-border/30 border border-border/50 mb-6">
          {[
            { label: "TVL", value: formatTvl(proto.tvl) },
            { label: "24h Change", value: changeStr, color: changeColor },
            { label: "Volume 24h", value: proto.volume_24h ? formatTvl(proto.volume_24h) : "N/A" },
            { label: "Fees 24h", value: proto.fees_24h ? formatTvl(proto.fees_24h) : "N/A" },
            { label: "Token Price", value: proto.token_price ? `$${proto.token_price.toFixed(4)}` : "N/A" },
          ].map((s) => (
            <div key={s.label} className="bg-bg-card p-3 text-center">
              <div className="text-sm" style={{ color: s.color ?? "#6090e0" }}>{s.value}</div>
              <div className="text-[8px] text-muted mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Additional info */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-border/30 border border-border/50 mb-6">
          {[
            { label: "Kudos", value: (proto.kudos_count ?? 0).toLocaleString() },
            { label: "Visits", value: (proto.visit_count ?? 0).toLocaleString() },
            { label: "Streak", value: `${proto.app_streak ?? 0}d` },
          ].map((s) => (
            <div key={s.label} className="bg-bg-card p-3 text-center">
              <div className="text-xs text-cream">{s.value}</div>
              <div className="text-[8px] text-muted mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* External links */}
        <div className="flex gap-2 mb-6">
          {proto.url && (
            <a
              href={proto.url}
              target="_blank"
              rel="noopener noreferrer"
              className="border-[2px] border-border px-3 py-1.5 text-[10px] text-cream transition-colors hover:border-border-light"
            >
              Website &rarr;
            </a>
          )}
          <a
            href={proto.token_mint ? `https://solscan.io/token/${proto.token_mint}` : `https://defillama.com/protocol/${proto.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="border-[2px] border-border px-3 py-1.5 text-[10px] text-cream transition-colors hover:border-border-light"
          >
            {proto.token_mint ? "Solscan" : "DeFiLlama"} &rarr;
          </a>
          <Link
            href={`/?user=${proto.slug}`}
            className="bg-[#6090e0] px-3 py-1.5 text-[10px] text-bg"
            style={{ boxShadow: "2px 2px 0 0 #203870" }}
          >
            View Building
          </Link>
        </div>

        {/* Category peers */}
        {peers.length > 0 && (
          <div className="border-[3px] border-border bg-bg-raised/80">
            <div className="px-4 py-2 border-b border-border/50">
              <h2 className="text-[10px] text-muted">
                Other {proto.category} protocols
              </h2>
            </div>
            {peers.map((peer, i) => (
              <Link
                key={peer.slug}
                href={`/${peer.slug}`}
                className={`flex items-center justify-between px-4 py-2 transition-colors hover:bg-bg-card ${
                  i < peers.length - 1 ? "border-b border-border/30" : ""
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="text-[10px] text-muted">#{peer.rank}</span>
                  {peer.logo_url && (
                    <Image
                      src={peer.logo_url}
                      alt={peer.name}
                      width={20}
                      height={20}
                      className="border border-border"
                      style={{ imageRendering: "pixelated" }}
                    />
                  )}
                  <span className="text-[11px] text-cream">{peer.name}</span>
                </span>
                <span className="text-[10px] text-muted">{formatTvl(peer.tvl)}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
