"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { isValidSolanaAddress, truncateAddress, formatTvl } from "@/lib/api/utils";
import ResidentAvatar from "@/components/ResidentAvatar";
import type { WalletData } from "@/lib/api/types";

interface ResidentInfo {
  display_name: string | null;
  house_style: string;
  house_color: string | null;
  created_at: string;
}

interface ProtocolInteraction {
  protocol_slug: string;
  tx_count: number;
}

export default function WalletPage() {
  const params = useParams();
  const address = params.address as string;
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [resident, setResident] = useState<ResidentInfo | null>(null);
  const [interactions, setInteractions] = useState<ProtocolInteraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllTransfers, setShowAllTransfers] = useState(false);

  useEffect(() => {
    if (!address || !isValidSolanaAddress(address)) {
      setError("Invalid Solana address");
      setLoading(false);
      return;
    }

    const walletFetch = fetch(`/api/wallet/${address}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data?.wallet ?? null)
      .catch(() => null);

    const residentFetch = fetch(`/api/resident/${address}`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);

    Promise.all([walletFetch, residentFetch]).then(([walletData, residentData]) => {
      if (walletData) setWallet(walletData);
      else setError("Failed to load wallet data");
      if (residentData?.resident) setResident(residentData.resident);
      if (residentData?.interactions) setInteractions(residentData.interactions);
      setLoading(false);
    });
  }, [address]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <span className="text-[10px] text-muted animate-pulse tracking-widest">LOADING...</span>
      </div>
    );
  }

  if (error || !wallet) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg">
        <p className="text-sm text-cream">{error ?? "Wallet not found"}</p>
        <Link href="/" className="text-[10px] text-muted hover:text-cream transition-colors">
          &larr; Back to Sol City
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-cream">
      {/* Header */}
      <div className="border-b-[3px] border-border bg-bg-raised/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link href="/" className="text-sm hover:text-white transition-colors">
            &larr; Sol <span className="text-[#6090e0]">City</span>
          </Link>
          <a
            href={`https://solscan.io/account/${wallet.address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-muted transition-colors hover:text-cream"
          >
            View on Solscan &rarr;
          </a>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-6">
        {/* Wallet header */}
        <div className="mb-6">
          <h1 className="text-lg text-cream font-mono">
            {wallet.label ?? truncateAddress(wallet.address)}
          </h1>
          {wallet.label && (
            <p className="text-[10px] text-muted mt-0.5 font-mono">
              {truncateAddress(wallet.address)}
            </p>
          )}
          {wallet.identity && wallet.identity !== wallet.label && (
            <p className="text-[10px] mt-1" style={{ color: "#14F195" }}>
              {wallet.identity}
            </p>
          )}
        </div>

        {/* Resident house card */}
        {resident && (
          <div className="mb-6 border-[3px] border-border bg-bg-raised/80 px-4 py-3">
            <div className="flex items-center gap-3">
              <ResidentAvatar
                walletAddress={address}
                size="md"
                houseColor={resident.house_color}
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px]" style={{ color: "#14F195" }}>
                    ★ SOL CITY RESIDENT
                  </span>
                </div>
                <p className="text-[9px] text-muted mt-0.5">
                  Joined {new Date(resident.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border/30 border border-border/50 mb-6">
          {[
            { label: "SOL Balance", value: `${wallet.solBalance} SOL` },
            { label: "Total USD", value: wallet.totalUsdValue ? `$${wallet.totalUsdValue.toLocaleString()}` : "N/A" },
            { label: "Tokens", value: (wallet.tokenCount ?? 0).toLocaleString() },
            { label: "Transactions", value: wallet.txCount >= 1000 ? `${wallet.txCount.toLocaleString()}+` : wallet.txCount.toLocaleString() },
          ].map((s) => (
            <div key={s.label} className="bg-bg-card p-3 text-center">
              <div className="text-sm" style={{ color: "#6090e0" }}>{s.value}</div>
              <div className="text-[8px] text-muted mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Protocol usage + funding source */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-border/30 border border-border/50 mb-6">
          {[
            { label: "Primary Protocol", value: wallet.primaryProtocol },
            { label: "Protocols Used", value: wallet.protocolsUsed.toLocaleString() },
            ...(wallet.fundedBy
              ? [{ label: "Funded By", value: truncateAddress(wallet.fundedBy) }]
              : []),
          ].map((s) => (
            <div key={s.label} className="bg-bg-card p-3 text-center">
              <div className="text-xs text-cream">{s.value}</div>
              <div className="text-[8px] text-muted mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Saved protocol interactions */}
        {interactions.length > 0 && (
          <div className="border-[3px] border-border bg-bg-raised/80 mb-6">
            <div className="px-4 py-2 border-b border-border/50">
              <h2 className="text-[10px] text-muted">Protocol Activity ({interactions.length})</h2>
            </div>
            {interactions.map((p, i) => (
              <Link
                key={p.protocol_slug}
                href={`/${p.protocol_slug}`}
                className={`flex items-center justify-between px-4 py-2 transition-colors hover:bg-border/10 ${
                  i < interactions.length - 1 ? "border-b border-border/30" : ""
                }`}
              >
                <span className="flex items-center gap-2">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: "#c8e64a" }}
                  />
                  <span className="text-[11px] text-cream">{p.protocol_slug}</span>
                </span>
                <span className="text-[9px] text-muted">{p.tx_count} txs</span>
              </Link>
            ))}
          </div>
        )}

        {/* Top tokens */}
        {wallet.topTokens && wallet.topTokens.length > 0 && (
          <div className="border-[3px] border-border bg-bg-raised/80 mb-6">
            <div className="px-4 py-2 border-b border-border/50">
              <h2 className="text-[10px] text-muted">Top Tokens</h2>
            </div>
            {wallet.topTokens.map((token, i) => (
              <div
                key={`${token.symbol}-${i}`}
                className={`flex items-center justify-between px-4 py-2 ${
                  i < wallet.topTokens!.length - 1 ? "border-b border-border/30" : ""
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="text-[11px] text-cream">{token.symbol}</span>
                  <span className="text-[9px] text-muted">{token.name}</span>
                </span>
                <span className="text-right">
                  <span className="block text-[10px] text-cream">
                    {token.balance.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                  </span>
                  {token.usdValue > 0 && (
                    <span className="block text-[8px] text-muted">
                      ${token.usdValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Recent transfers */}
        {wallet.recentTransfers && wallet.recentTransfers.length > 0 && (() => {
          const visible = showAllTransfers ? wallet.recentTransfers! : wallet.recentTransfers!.slice(0, 10);
          const hasMore = wallet.recentTransfers!.length > 10;

          return (
            <div className="border-[3px] border-border bg-bg-raised/80 mb-6">
              <div className="px-4 py-2 border-b border-border/50">
                <h2 className="text-[10px] text-muted">
                  Recent Transfers ({wallet.recentTransfers!.length})
                </h2>
              </div>
              {visible.map((tx, i) => (
                <a
                  key={`${tx.signature}-${i}`}
                  href={`https://solscan.io/tx/${tx.signature}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center justify-between px-4 py-2 hover:bg-border/10 transition-colors ${
                    i < visible.length - 1 ? "border-b border-border/30" : ""
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="text-[10px] font-mono"
                      style={{ color: tx.type === "received" ? "#14F195" : "#F14668" }}
                    >
                      {tx.type === "received" ? "IN" : "OUT"}
                    </span>
                    <span className="text-[10px] text-cream">
                      {tx.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })} {tx.symbol}
                    </span>
                  </span>
                  <span className="text-[9px] text-muted">
                    {tx.type === "received"
                      ? `from ${truncateAddress(tx.from)}`
                      : `to ${truncateAddress(tx.to)}`}
                  </span>
                </a>
              ))}
              {hasMore && (
                <button
                  onClick={() => setShowAllTransfers(!showAllTransfers)}
                  className="w-full border-t border-border/30 px-4 py-2 text-[10px] text-muted transition-colors hover:text-cream hover:bg-border/10"
                >
                  {showAllTransfers
                    ? "Show Less"
                    : `Show All ${wallet.recentTransfers!.length} Transfers`}
                </button>
              )}
            </div>
          );
        })()}

        {/* Actions */}
        <div className="flex gap-2">
          <a
            href={`https://solscan.io/account/${wallet.address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="border-[2px] border-border px-3 py-1.5 text-[10px] text-cream transition-colors hover:border-border-light"
          >
            Solscan &rarr;
          </a>
          <Link
            href="/"
            className="bg-[#6090e0] px-3 py-1.5 text-[10px] text-bg"
            style={{ boxShadow: "2px 2px 0 0 #203870" }}
          >
            Back to City
          </Link>
        </div>
      </div>
    </div>
  );
}
