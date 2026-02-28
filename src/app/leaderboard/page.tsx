import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase";
import LeaderboardTracker from "@/components/LeaderboardTracker";
import ResidentAvatar from "@/components/ResidentAvatar";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Leaderboard - Sol City",
  description:
    "Top Solana protocols ranked by TVL, volume, fees, and more in Sol City.",
};

interface Protocol {
  slug: string;
  name: string;
  category: string | null;
  tvl: number;
  volume_24h: number | null;
  fees_24h: number | null;
  change_24h: number | null;
  logo_url: string | null;
  rank: number | null;
}

interface Trader {
  address: string;
  name: string | null;
  houseColor: string | null;
  pnl: number;
  unrealizedPnl: number;
  winRate: number;
  volume: number;
  trades: number;
  tokensTraded: number;
  bestToken: { symbol: string; pnlUsd: number } | null;
  worstToken: { symbol: string; pnlUsd: number } | null;
}

type TabId = "tvl" | "volume" | "fees" | "change" | "residents";

const TABS: { id: TabId; label: string }[] = [
  { id: "tvl", label: "TVL" },
  { id: "volume", label: "Volume 24h" },
  { id: "fees", label: "Fees 24h" },
  { id: "change", label: "24h Change" },
  { id: "residents", label: "Residents" },
];

const ACCENT = "#c8e64a";

function rankColor(rank: number): string {
  if (rank === 1) return "#ffd700";
  if (rank === 2) return "#c0c0c0";
  if (rank === 3) return "#cd7f32";
  return ACCENT;
}

function fmtUsd(val: number | null): string {
  if (val == null || val === 0) return "—";
  if (val >= 1e9) return "$" + (val / 1e9).toFixed(2) + "B";
  if (val >= 1e6) return "$" + (val / 1e6).toFixed(1) + "M";
  if (val >= 1e3) return "$" + (val / 1e3).toFixed(0) + "K";
  return "$" + val.toLocaleString();
}

function fmtChange(val: number | null): string {
  if (val == null) return "—";
  const sign = val >= 0 ? "+" : "";
  return sign + val.toFixed(1) + "%";
}

function fmtPnl(val: number): string {
  const prefix = val >= 0 ? "+$" : "-$";
  return `${prefix}${Math.abs(val).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function truncateAddr(addr: string): string {
  return addr.slice(0, 4) + "..." + addr.slice(-4);
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const activeTab = (params.tab ?? "tvl") as TabId;

  let protocols: Protocol[] = [];
  let traders: Trader[] = [];

  if (activeTab === "residents") {
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ??
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");
    try {
      const res = await fetch(`${baseUrl}/api/top-traders`, { next: { revalidate: 300 } });
      if (res.ok) {
        const json = await res.json();
        traders = json.traders ?? [];
      }
    } catch {
      /* fetch failed — traders stays empty */
    }
  } else {
    const supabase = getSupabaseAdmin();

    const orderColumn = activeTab === "tvl" ? "rank"
      : activeTab === "volume" ? "volume_24h"
      : activeTab === "fees" ? "fees_24h"
      : "change_24h";
    const orderAscending = activeTab === "tvl";

    const { data } = await supabase
      .from("protocols")
      .select("slug, name, category, tvl, volume_24h, fees_24h, change_24h, logo_url, rank")
      .order(orderColumn, { ascending: orderAscending, nullsFirst: false })
      .limit(50);

    protocols = (data ?? []) as Protocol[];
  }

  function getMetricValue(p: Protocol): string {
    switch (activeTab) {
      case "tvl": return fmtUsd(p.tvl);
      case "volume": return fmtUsd(p.volume_24h);
      case "fees": return fmtUsd(p.fees_24h);
      case "change": return fmtChange(p.change_24h);
      default: return "";
    }
  }

  function getChangeColor(p: Protocol): string | undefined {
    if (activeTab !== "change" || p.change_24h == null) return undefined;
    return p.change_24h >= 0 ? "#4ade80" : "#f87171";
  }

  const metricLabel = activeTab === "tvl" ? "TVL"
    : activeTab === "volume" ? "Volume"
    : activeTab === "fees" ? "Fees"
    : "24h %";

  return (
    <main className="min-h-screen bg-bg font-pixel uppercase text-warm">
      <LeaderboardTracker tab={activeTab} />
      <div className="mx-auto max-w-3xl px-4 py-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="text-xs text-muted transition-colors hover:text-cream"
          >
            &larr; Back to City
          </Link>
        </div>

        <div className="mt-6 text-center">
          <h1 className="text-3xl text-cream md:text-4xl">
            Leader<span style={{ color: ACCENT }}>board</span>
          </h1>
          <p className="mt-3 text-xs text-muted normal-case">
            {activeTab === "residents"
              ? "Resident traders ranked by realized PnL"
              : "Top Solana protocols ranked in Sol City"}
          </p>
        </div>

        {/* Tabs */}
        <div className="mt-6 flex flex-wrap justify-center gap-1">
          {TABS.map((tab) => (
            <Link
              key={tab.id}
              href={`/leaderboard?tab=${tab.id}`}
              className="px-3 py-1.5 text-[10px] transition-colors border-[2px]"
              style={{
                borderColor: activeTab === tab.id ? ACCENT : "var(--color-border)",
                color: activeTab === tab.id ? ACCENT : "var(--color-muted)",
                backgroundColor: activeTab === tab.id ? "rgba(200, 230, 74, 0.1)" : "transparent",
              }}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {/* Table */}
        <div className="mt-6 border-[3px] border-border">
          {activeTab === "residents" ? (
            <>
              {/* Residents header */}
              <div className="flex items-center gap-4 border-b-[3px] border-border bg-bg-card px-5 py-3 text-xs text-muted">
                <span className="w-10 text-center">#</span>
                <span className="flex-1">Resident</span>
                <span className="hidden w-20 text-right sm:block">Win Rate</span>
                <span className="w-28 text-right">PnL</span>
              </div>

              {/* Resident rows */}
              {traders.map((t, i) => {
                const pos = i + 1;
                const pnlColor = t.pnl >= 0 ? "#4ade80" : "#f87171";
                return (
                  <Link
                    key={t.address}
                    href={`/wallet/${t.address}`}
                    className="flex items-center gap-4 border-b border-border/50 px-5 py-3.5 transition-colors hover:bg-bg-card"
                  >
                    <span className="w-10 text-center">
                      <span
                        className="text-sm font-bold"
                        style={{ color: rankColor(pos) }}
                      >
                        {pos}
                      </span>
                    </span>

                    <div className="flex flex-1 items-center gap-3 overflow-hidden">
                      <ResidentAvatar
                        walletAddress={t.address}
                        size="sm"
                        houseColor={t.houseColor}
                        interactive={false}
                      />
                      <div className="overflow-hidden">
                        <p className="truncate text-sm text-cream">
                          {t.name || truncateAddr(t.address)}
                        </p>
                        <p className="truncate text-[10px] text-muted">
                          {t.trades.toLocaleString()} trades
                        </p>
                      </div>
                    </div>

                    <span className="hidden w-20 text-right text-xs text-muted sm:block">
                      {t.winRate.toFixed(0)}%
                    </span>

                    <span
                      className="w-28 text-right text-sm"
                      style={{ color: pnlColor }}
                    >
                      {fmtPnl(t.pnl)}
                    </span>
                  </Link>
                );
              })}

              {traders.length === 0 && (
                <div className="px-5 py-8 text-center text-xs text-muted normal-case">
                  No resident trading data yet.
                </div>
              )}
            </>
          ) : (
            <>
              {/* Protocol header */}
              <div className="flex items-center gap-4 border-b-[3px] border-border bg-bg-card px-5 py-3 text-xs text-muted">
                <span className="w-10 text-center">#</span>
                <span className="flex-1">Protocol</span>
                <span className="hidden w-24 text-right sm:block">Category</span>
                <span className="w-28 text-right">{metricLabel}</span>
              </div>

              {/* Protocol rows */}
              {protocols.map((p, i) => {
                const pos = i + 1;
                return (
                  <Link
                    key={p.slug}
                    href={`/${p.slug}`}
                    className="flex items-center gap-4 border-b border-border/50 px-5 py-3.5 transition-colors hover:bg-bg-card"
                  >
                    <span className="w-10 text-center">
                      <span
                        className="text-sm font-bold"
                        style={{ color: rankColor(pos) }}
                      >
                        {pos}
                      </span>
                    </span>

                    <div className="flex flex-1 items-center gap-3 overflow-hidden">
                      {p.logo_url && (
                        <Image
                          src={p.logo_url}
                          alt={p.name}
                          width={36}
                          height={36}
                          className="border-[2px] border-border flex-shrink-0"
                          style={{ imageRendering: "pixelated" }}
                        />
                      )}
                      <div className="overflow-hidden">
                        <p className="truncate text-sm text-cream">
                          {p.name}
                        </p>
                        <p className="truncate text-[10px] text-muted">
                          {p.slug}
                        </p>
                      </div>
                    </div>

                    <span className="hidden w-24 text-right text-xs text-muted sm:block">
                      {p.category ?? "\u2014"}
                    </span>

                    <span
                      className="w-28 text-right text-sm"
                      style={{ color: getChangeColor(p) ?? ACCENT }}
                    >
                      {getMetricValue(p)}
                    </span>
                  </Link>
                );
              })}

              {protocols.length === 0 && (
                <div className="px-5 py-8 text-center text-xs text-muted normal-case">
                  No data for this category yet.
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="btn-press inline-block px-7 py-3.5 text-sm text-bg"
            style={{
              backgroundColor: ACCENT,
              boxShadow: "4px 4px 0 0 #5a7a00",
            }}
          >
            Enter the City
          </Link>

        </div>
      </div>
    </main>
  );
}
