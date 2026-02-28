// ═══════════════════════════════════════════════════
// HELIUS API — Wallet balances, history, identity
// Free tier: 500K credits/month, 10 RPS
// ═══════════════════════════════════════════════════

import type { WalletData, WalletToken, WalletTransfer } from './types';
import { SOL_MINT } from './registry';
import { fetchWithTimeout } from './utils';

const HELIUS_BASE = 'https://api.helius.xyz';

// ── Fetch wallet data (v1 API with v0 fallback) ──
export async function fetchWallet(
  address: string,
  heliusApiKey?: string
): Promise<WalletData> {
  const key = heliusApiKey || process.env.HELIUS_API_KEY;
  if (!key) return generateMockWallet(address);

  try {
    const [balancesRes, historyRes, identityRes, transfersRes, fundedByRes, sigCountRes] = await Promise.all([
      fetchWithTimeout(`${HELIUS_BASE}/v1/wallet/${address}/balances?api-key=${key}`, { timeout: 10_000 }),
      // v0 enhanced transactions gives us source/type for protocol detection
      fetchWithTimeout(`${HELIUS_BASE}/v0/addresses/${address}/transactions?api-key=${key}&limit=50`, { timeout: 10_000 }).catch(() => null),
      fetchWithTimeout(`${HELIUS_BASE}/v1/wallet/${address}/identity?api-key=${key}`, { timeout: 10_000 }).catch(() => null),
      fetchWithTimeout(`${HELIUS_BASE}/v1/wallet/${address}/transfers?api-key=${key}&limit=50`, { timeout: 10_000 }).catch(() => null),
      fetchWithTimeout(`${HELIUS_BASE}/v1/wallet/${address}/funded-by?api-key=${key}`, { timeout: 10_000 }).catch(() => null),
      // RPC call for total transaction count
      fetchWithTimeout(`https://mainnet.helius-rpc.com/?api-key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0', id: 1,
          method: 'getSignaturesForAddress',
          params: [address, { limit: 1000 }],
        }),
        timeout: 10_000,
      }).catch(() => null),
    ]);

    if (!balancesRes.ok) throw new Error(`Balances API ${balancesRes.status}`);
    const balances = await balancesRes.json();

    // Helius v1 balances returns nativeBalance (lamports) at the top level,
    // and tokens in a separate array (balances / tokens / fungibleTokens).
    const rawBalances = balances.balances || balances.tokens || balances.fungibleTokens || [];
    const totalUsd = balances.totalUsdValue ?? 0;

    // Native SOL: top-level field (lamports), or inside the balances array
    let nativeBalance = 0;
    if (balances.nativeBalance != null) {
      nativeBalance = balances.nativeBalance / 1e9;
    }

    const tokens: WalletToken[] = [];

    for (const t of rawBalances) {
      const sym = t.symbol || t.tokenSymbol || '???';
      const bal = t.balance ?? t.amount ?? 0;
      const usd = t.usdValue ?? t.valueUsd ?? 0;

      // Helius returns native SOL with mint So1111...1 — match by symbol
      if (sym === 'SOL' && (!t.mint || t.mint.startsWith('So1111'))) {
        if (nativeBalance === 0) nativeBalance = bal;
      } else {
        tokens.push({
          symbol: sym,
          name: t.name || t.tokenName || 'Unknown',
          balance: bal,
          usdValue: usd,
          logoUri: t.logoUri || t.logo || undefined,
        });
      }
    }

    tokens.sort((a, b) => b.usdValue - a.usdValue);
    const topTokens = tokens.slice(0, 8);

    // Parse TX history for protocol usage
    // v0 enhanced transactions returns a direct array with .source field
    let txCount = 0;
    const protocols = new Set<string>();
    const protoCounts: Record<string, number> = {};

    // Get total tx count from RPC signatures
    if (sigCountRes && sigCountRes.ok) {
      try {
        const rpcData = await sigCountRes.json();
        const sigs = rpcData.result;
        if (Array.isArray(sigs)) txCount = sigs.length;
      } catch { /* fall back to enhanced tx count */ }
    }

    if (historyRes && historyRes.ok) {
      const history = await historyRes.json();
      const txList = Array.isArray(history) ? history : (history.data || []);
      if (txCount === 0) txCount = txList.length;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const tx of txList as any[]) {
        const source = tx.source || tx.type;
        if (source) {
          protocols.add(source);
          protoCounts[source] = (protoCounts[source] || 0) + 1;
        }
      }
    }

    const primaryProtocol = Object.entries(protoCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'Jupiter';

    // Parse identity
    let identity: string | undefined;
    if (identityRes && identityRes.ok) {
      const id = await identityRes.json();
      identity = id.name || id.identity || undefined;
    }

    // Parse recent transfers
    // Helius v1 response: { data: [{ signature, timestamp, direction, counterparty, mint, symbol, amount }], pagination }
    let recentTransfers: WalletTransfer[] | undefined;
    if (transfersRes && transfersRes.ok) {
      try {
        const transferData = await transfersRes.json();
        const rawTransfers = transferData.data || transferData.transfers || [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recentTransfers = (rawTransfers as any[]).slice(0, 50).map((t) => {
          const direction = t.direction === 'out' ? 'sent' as const : 'received' as const;
          const counterparty = t.counterparty || '';
          return {
            signature: t.signature || '',
            timestamp: t.timestamp || 0,
            from: direction === 'received' ? counterparty : address,
            to: direction === 'sent' ? counterparty : address,
            amount: t.amount ?? 0,
            symbol: t.symbol || t.mint?.slice(0, 6) || 'SPL',
            type: direction,
          };
        });
      } catch {
        // Transfers parsing failed, continue without
      }
    }

    // Parse funding source
    // Helius v1 response: { funder, funderName, symbol, amount, signature, date }
    let fundedBy: string | undefined;
    if (fundedByRes && fundedByRes.ok) {
      try {
        const fundedData = await fundedByRes.json();
        fundedBy = fundedData.funder || fundedData.address || undefined;
      } catch {
        // Funded-by parsing failed, continue without
      }
    }

    return {
      address,
      label: identity,
      primaryProtocol,
      txCount,
      protocolsUsed: protocols.size,
      solBalance: Math.round(nativeBalance * 100) / 100,
      tokenCount: tokens.length,
      totalUsdValue: Math.round(totalUsd * 100) / 100,
      topTokens,
      recentTransfers,
      identity,
      fundedBy,
    };
  } catch (err) {
    console.warn('Helius v1 Wallet API failed, trying v0 fallback:', err);
    return fetchWalletV0(address, key);
  }
}

// ── v0 fallback ──
async function fetchWalletV0(address: string, key: string): Promise<WalletData> {
  try {
    const [balanceRes, historyRes] = await Promise.all([
      fetchWithTimeout(`${HELIUS_BASE}/v0/addresses/${address}/balances?api-key=${key}`, { timeout: 10_000 }),
      fetchWithTimeout(`${HELIUS_BASE}/v0/addresses/${address}/transactions?api-key=${key}&limit=100`, { timeout: 10_000 }),
    ]);

    if (!balanceRes.ok || !historyRes.ok) throw new Error('Helius v0 API error');

    const balance = await balanceRes.json();
    const history = await historyRes.json();

    const solBalance = (balance.nativeBalance || 0) / 1e9;
    const protocols = new Set<string>();
    const protoCounts: Record<string, number> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (history as any[]).forEach((tx) => {
      if (tx.source) {
        protocols.add(tx.source);
        protoCounts[tx.source] = (protoCounts[tx.source] || 0) + 1;
      }
    });
    const primaryProtocol = Object.entries(protoCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'Jupiter';

    return {
      address,
      primaryProtocol,
      txCount: history.length,
      protocolsUsed: protocols.size,
      solBalance: Math.round(solBalance * 10) / 10,
      tokenCount: balance.tokens?.length || 0,
    };
  } catch (err) {
    console.warn('Helius v0 also failed, using mock:', err);
    return generateMockWallet(address);
  }
}

// ── Mock wallet generator ──
function generateMockWallet(address: string): WalletData {
  const primaryOptions = ['Jupiter', 'Raydium', 'Marinade', 'Jito', 'Drift'];
  return {
    address,
    primaryProtocol: primaryOptions[Math.floor(Math.random() * primaryOptions.length)],
    txCount: Math.floor(Math.random() * 3000) + 100,
    protocolsUsed: Math.floor(Math.random() * 15) + 3,
    solBalance: Math.round((Math.random() * 500 + 1) * 10) / 10,
    tokenCount: Math.floor(Math.random() * 30) + 2,
  };
}
