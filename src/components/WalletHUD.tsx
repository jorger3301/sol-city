"use client";

import { useState } from "react";
import { truncateAddress, formatTvl } from "@/lib/api/utils";
import ResidentAvatar from "@/components/ResidentAvatar";
import type { WalletData, WalletPnL } from "@/lib/api/types";

function formatPnl(value: number | null): string {
  if (value == null) return "N/A";
  const prefix = value >= 0 ? "+$" : "-$";
  return `${prefix}${Math.abs(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

interface WalletHUDProps {
  walletAddress: string;
  walletData: WalletData | null;
  interactedProtocols: { protocol_slug: string; tx_count: number }[];
  isResident: boolean;
  accentColor: string;
  onClaimHouse: () => void;
  onProtocolClick: (slug: string) => void;
  onResidentClick?: () => void;
  claiming: boolean;
  houseColor?: string | null;
}

export default function WalletHUD({
  walletAddress,
  walletData,
  interactedProtocols,
  isResident,
  accentColor,
  onClaimHouse,
  onProtocolClick,
  onResidentClick,
  claiming,
  houseColor,
}: WalletHUDProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="fixed bottom-4 right-4 z-50 animate-[fade-in_0.2s_ease-out]"
      style={{ fontFamily: "'Silkscreen', monospace" }}
    >
      {/* Collapsed pill */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 border-[2px] px-3 py-1.5 backdrop-blur-sm transition-all hover:border-border-light"
        style={{
          borderColor: accentColor + "66",
          backgroundColor: "rgba(13, 13, 15, 0.85)",
        }}
      >
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: "#14F195" }}
        />
        <span className="text-[10px] text-cream">
          {truncateAddress(walletAddress)}
        </span>
        {walletData && (
          <span className="text-[10px] text-muted">
            {walletData.solBalance} SOL
          </span>
        )}
        <span className="text-[10px] text-muted">
          {expanded ? "▼" : "▲"}
        </span>
      </button>

      {/* Expanded panel */}
      {expanded && (
        <div
          className="mt-1 w-[280px] border-[2px] backdrop-blur-sm animate-[fade-in_0.15s_ease-out]"
          style={{
            borderColor: accentColor + "44",
            backgroundColor: "rgba(13, 13, 15, 0.92)",
          }}
        >
          {/* Portfolio header */}
          <div className="border-b border-border px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted">PORTFOLIO</span>
              {!isResident && (
                <button
                  onClick={onClaimHouse}
                  disabled={claiming}
                  className="border-[2px] px-2 py-0.5 text-[9px] transition-colors hover:border-border-light disabled:opacity-50"
                  style={{
                    borderColor: accentColor + "66",
                    color: accentColor,
                  }}
                >
                  {claiming ? "Claiming..." : "Claim House"}
                </button>
              )}
              {isResident && (
                <button
                  onClick={onResidentClick}
                  className="text-[9px] transition-colors hover:brightness-125"
                  style={{ color: "#14F195" }}
                >
                  ★ Resident
                </button>
              )}
            </div>

            {/* House color indicator for residents */}
            {isResident && (
              <div className="mt-2 flex items-center gap-2">
                <div className="text-[8px] text-muted">HOUSE</div>
                <ResidentAvatar
                  walletAddress={walletAddress}
                  size="xs"
                  houseColor={houseColor}
                  interactive={false}
                />
                <a
                  href="/shop"
                  className="text-[8px] transition-colors hover:text-cream"
                  style={{ color: accentColor }}
                >
                  Customize &rarr;
                </a>
              </div>
            )}

            {walletData && (
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                <div>
                  <div className="text-[9px] text-muted">Balance</div>
                  <div className="text-[11px] text-cream">
                    {walletData.solBalance} SOL
                  </div>
                </div>
                <div>
                  <div className="text-[9px] text-muted">Value</div>
                  <div className="text-[11px] text-cream">
                    {formatTvl(walletData.totalUsdValue ?? 0)}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] text-muted">Tokens</div>
                  <div className="text-[11px] text-cream">
                    {walletData.tokenCount ?? 0}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Trading PnL */}
          {walletData?.pnl && walletData.pnl.tradesCount > 0 && (
            <PnLSection pnl={walletData.pnl} accentColor={accentColor} />
          )}

          {/* Protocol interactions — these light up in the city */}
          {interactedProtocols.length > 0 && (
            <div className="px-3 py-2">
              <div className="mb-1.5 text-[9px] text-muted">
                YOUR PROTOCOLS ({interactedProtocols.length})
              </div>
              <div className="max-h-[140px] overflow-y-auto">
                {interactedProtocols.slice(0, 12).map((p) => (
                  <button
                    key={p.protocol_slug}
                    onClick={() => onProtocolClick(p.protocol_slug)}
                    className="flex w-full items-center justify-between px-1 py-1 text-left transition-colors hover:bg-bg-card"
                  >
                    <span className="flex items-center gap-1.5">
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: accentColor }}
                      />
                      <span className="text-[10px] text-cream">
                        {p.protocol_slug}
                      </span>
                    </span>
                    <span className="text-[9px] text-muted">
                      {p.tx_count} txs
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Top tokens */}
          {walletData?.topTokens && walletData.topTokens.length > 0 && (
            <div className="border-t border-border px-3 py-2">
              <div className="mb-1 text-[9px] text-muted">TOP HOLDINGS</div>
              {walletData.topTokens.slice(0, 4).map((t, i) => (
                <div
                  key={`${t.symbol}-${i}`}
                  className="flex items-center justify-between py-0.5"
                >
                  <span className="text-[10px] text-cream">{t.symbol}</span>
                  <span className="text-[9px] text-muted">
                    ${t.usdValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PnLSection({ pnl, accentColor }: { pnl: WalletPnL; accentColor: string }) {
  const totalPnl = (pnl.realizedPnlUsd ?? 0) + (pnl.unrealizedPnlUsd ?? 0);
  const pnlColor = totalPnl >= 0 ? "#14F195" : "#f85149";

  return (
    <div className="border-t border-border px-3 py-2">
      <div className="mb-1.5 text-[9px] text-muted">TRADING STATS</div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <div className="text-[9px] text-muted">PnL</div>
          <div className="text-[11px]" style={{ color: pnlColor }}>
            {formatPnl(totalPnl)}
          </div>
        </div>
        <div>
          <div className="text-[9px] text-muted">Win Rate</div>
          <div className="text-[11px] text-cream">
            {pnl.winRate.toFixed(0)}%
          </div>
        </div>
        <div>
          <div className="text-[9px] text-muted">Trades</div>
          <div className="text-[11px] text-cream">
            {pnl.tradesCount.toLocaleString()}
          </div>
        </div>
      </div>
      {(pnl.bestToken || pnl.worstToken) && (
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          {pnl.bestToken && (
            <div>
              <div className="text-[9px] text-muted">Best</div>
              <div className="text-[10px]" style={{ color: "#14F195" }}>
                {pnl.bestToken.symbol}
              </div>
              <div className="text-[8px]" style={{ color: "#14F195" }}>
                {formatPnl(pnl.bestToken.pnlUsd)}
              </div>
            </div>
          )}
          {pnl.worstToken && (
            <div>
              <div className="text-[9px] text-muted">Worst</div>
              <div className="text-[10px]" style={{ color: "#f85149" }}>
                {pnl.worstToken.symbol}
              </div>
              <div className="text-[8px]" style={{ color: "#f85149" }}>
                {formatPnl(pnl.worstToken.pnlUsd)}
              </div>
            </div>
          )}
        </div>
      )}
      <div className="mt-1 text-[7px] text-muted" style={{ opacity: 0.5 }}>
        via <span style={{ color: accentColor }}>Vybe Network</span>
      </div>
    </div>
  );
}
