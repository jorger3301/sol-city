// ═══════════════════════════════════════════════════
// SOL CITY TYPE DEFINITIONS
// ═══════════════════════════════════════════════════

export type ProtocolCategory =
  | 'DEX'
  | 'Liquid Staking'
  | 'Lending'
  | 'Perps'
  | 'NFT'
  | 'Launchpad'
  | 'Yield'
  | 'Payments'
  | 'Infrastructure';

export interface Protocol {
  name: string;
  slug: string;
  category: ProtocolCategory;
  tvl: number;
  change24h?: number;
  chain: string;
  logoUrl?: string;
  description?: string;
  url?: string;
  // Price data (Jupiter)
  tokenMint?: string;
  tokenPrice?: number;
  priceChange24h?: number;
  // Volume / fees / trending
  trendingRank?: number;
  volume24h?: number;
  fees24h?: number;
  isTrending?: boolean;
}

export interface WalletToken {
  symbol: string;
  name: string;
  balance: number;
  usdValue: number;
  logoUri?: string;
}

export interface WalletTransfer {
  signature: string;
  timestamp: number;
  from: string;
  to: string;
  amount: number;
  symbol: string;
  type: 'sent' | 'received';
}

export interface WalletPnL {
  winRate: number;
  realizedPnlUsd: number | null;
  unrealizedPnlUsd: number | null;
  uniqueTokensTraded: number;
  tradesCount: number;
  tradesVolumeUsd: number;
  bestToken: { symbol: string; pnlUsd: number } | null;
  worstToken: { symbol: string; pnlUsd: number } | null;
}

export interface WalletData {
  address: string;
  label?: string;
  primaryProtocol: string;
  txCount: number;
  protocolsUsed: number;
  solBalance: number;
  tokenCount?: number;
  totalUsdValue?: number;
  topTokens?: WalletToken[];
  recentTransfers?: WalletTransfer[];
  identity?: string;
  fundedBy?: string;
  pnl?: WalletPnL;
}

export interface JupiterPriceResult {
  mint: string;
  price: number;
}
