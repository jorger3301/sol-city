// ═══════════════════════════════════════════════════
// SOLANA UTILITIES
// ═══════════════════════════════════════════════════

// Validate Solana address (base58, 32-44 chars)
export function isValidSolanaAddress(input: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(input);
}

// Format TVL for display
export function formatTvl(val: number): string {
  if (val >= 1e9) return '$' + (val / 1e9).toFixed(2) + 'B';
  if (val >= 1e6) return '$' + (val / 1e6).toFixed(0) + 'M';
  if (val >= 1e3) return '$' + (val / 1e3).toFixed(0) + 'K';
  return '$' + val.toLocaleString();
}

// Truncate wallet address for display
export function truncateAddress(addr: string): string {
  return addr.slice(0, 6) + '...' + addr.slice(-4);
}

// Explorer links — Solscan
const EXPLORER_BASE = 'https://solscan.io';

export const explorerUrl = {
  wallet: (address: string) => `${EXPLORER_BASE}/account/${address}`,
  tx: (signature: string) => `${EXPLORER_BASE}/tx/${signature}`,
};

// Fetch Solana TPS from RPC
export async function fetchSolanaTps(): Promise<number> {
  const endpoints: string[] = [];
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_HELIUS_API_KEY) {
    endpoints.push(`https://mainnet.helius-rpc.com/?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}`);
  }
  endpoints.push('https://api.mainnet-beta.solana.com');

  for (const rpcUrl of endpoints) {
    try {
      const res = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getRecentPerformanceSamples',
          params: [4],
        }),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) continue;
      const json = await res.json();
      if (json.error) continue;
      const samples = json.result;
      if (!samples || samples.length === 0) continue;

      const totalTps = samples.reduce(
        (sum: number, s: { numTransactions: number; samplePeriodSecs: number }) =>
          sum + s.numTransactions / s.samplePeriodSecs,
        0
      );
      const tps = Math.round(totalTps / samples.length);
      if (tps > 0) return tps;
    } catch {
      // Try next endpoint
    }
  }

  return 0;
}
