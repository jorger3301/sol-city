// ═══════════════════════════════════════════════════
// PROTOCOL → TOKEN MINT REGISTRY
// ═══════════════════════════════════════════════════

import type { ProtocolCategory } from './types';

// Protocol slug → Solana token mint address
export const PROTOCOL_MINTS: Record<string, string> = {
  // DEX / Perps
  'jupiter':          'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
  'raydium':          '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
  'orca':             'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE',
  'drift':            'DriFtupJYLTosbwoN8koMbEYSx54aFAVLddWsbksjwg7',
  'phoenix':          'PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqLR89jjFHGqdXY',
  'meteora':          'METAewgxyPbgwsseH8T16a39CQ5VyVxZi9zXiDPY18m',
  // Liquid Staking
  'marinade-finance': 'MNDEFzGvMt87ueuHvVU9VcTqsAP5b3fTGPsHuuPA5ey',
  'jito':             'jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL',
  'sanctum':          'SANMFRfQEqAvqudw7ikfVrKBRshGz8E7ToaiPfCNuSU',
  'blazestake':       'BLZEEuZUBVqFhj8adcCFPJvPVCiCyVmh3hkJMrU8KuJA',
  'lido':             '7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj',
  // Lending / Yield
  'kamino':           'KMNO3kkBSiEvyJRRFfCzjYROo3DF7TiJXVNFVEZMeui',
  'solend':           'SLNDpmoWTVADgEdndyvWzroNKFicio1X9cfo8xHUv5un',
  'marginfi':         'MFv2hWf31Z9kbCa1snEPYctwafyhdvnV7FZnsebVacA',
  'mango':            'MangoCzJ36AjZyKwVj3VnYU4GTonjfVEnJmvvWaxLac',
  'hubble':           'HBB111SCo9jkCejsZfz8Ec8nH7T6THF8KEKSnvwT6XK6',
  // NFT / Launchpad
  'tensor':           'TNSRxcUxoT9xBG3de7PiJyTDYu7kskLqcpddxnEJAS6',
  // Perps / Options
  'parcl':            'PARCLhPMbSRZSHxSPRZv9HUckvvKNXMCHTak2PfpUPR',
  'zeta-markets':     'ZEXy1pqteRu3n13kdyh4LnSQExKJJhGkFyiMGKysRAbm',
  'hxro':             'HxhWkVpk5NS4Ltg5nij2G671CKXFRKPK8vy271Ub4uEK',
  // Infrastructure / Other
  'helium':           'hntyVP6YFm1Hg25TN9WGLqM12b8TQmcknKrdu1oxWux',
  'pyth':             'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3',
  'render':           'rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof',
  'nosana':           'nosXBVoaCTtYdLvKY6Csb4AC8JCdQKKAaWYtx2ZMoo7',
  'wormhole':         '85VBFQZC9TZkfaptBWjvUw7YbZjy52A6mjtPGjstQAmQ',
  'bonk':             'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
};

export const SOL_MINT = 'So11111111111111111111111111111111111111112';

// DeFiLlama category → Sol City category
// DeFiLlama uses "Dexs" (no 'e') as of 2025
export const CATEGORY_MAP: Record<string, ProtocolCategory> = {
  'Dexes': 'DEX',
  'Dexs': 'DEX',
  'Liquid Staking': 'Liquid Staking',
  'Liquid Restaking': 'Liquid Staking',
  'Staking Pool': 'Liquid Staking',
  'Restaking': 'Liquid Staking',
  'Lending': 'Lending',
  'CDP': 'Lending',
  'Derivatives': 'Perps',
  'Options': 'Perps',
  'Options Vault': 'Perps',
  'Options Dex': 'Perps',
  'Prediction Market': 'Perps',
  'Basis Trading': 'Perps',
  'Synthetics': 'Perps',
  'NFT Marketplace': 'NFT',
  'NFT Lending': 'NFT',
  'Launchpad': 'Launchpad',
  'Yield Aggregator': 'Yield',
  'Yield': 'Yield',
  'Leveraged Farming': 'Yield',
  'Liquidity manager': 'Yield',
  'Payments': 'Payments',
};

export function mapCategory(raw: string): ProtocolCategory {
  return CATEGORY_MAP[raw] || 'Infrastructure';
}
