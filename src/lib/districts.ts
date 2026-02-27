// ═══════════════════════════════════════════════════
// CITY DISTRICTS — Category → District metadata
// ═══════════════════════════════════════════════════

import type { ProtocolCategory } from './api/types';

export interface DistrictMeta {
  name: string;
  color: string;
  hex: number;
}

export const DISTRICT_META: Record<ProtocolCategory, DistrictMeta> = {
  'DEX':            { name: 'DEX District',      color: '#14F195', hex: 0x14F195 },
  'Liquid Staking': { name: 'Staking Quarter',   color: '#00D1FF', hex: 0x00D1FF },
  'Lending':        { name: 'Lending Lane',      color: '#FF9F43', hex: 0xFF9F43 },
  'Perps':          { name: 'Perps Plaza',       color: '#9945FF', hex: 0x9945FF },
  'Yield':          { name: 'Yield Gardens',     color: '#54A0FF', hex: 0x54A0FF },
  'Infrastructure': { name: 'Infra Alley',       color: '#E8E8E8', hex: 0xE8E8E8 },
  'NFT':            { name: 'NFT Market',        color: '#C678DD', hex: 0xC678DD },
  'Launchpad':      { name: 'Launch Pad',        color: '#FF4D6A', hex: 0xFF4D6A },
  'Payments':       { name: 'Payments Port',     color: '#69DB7C', hex: 0x69DB7C },
};

// Get district for a category (with fallback)
export function getDistrict(category: ProtocolCategory): DistrictMeta {
  return DISTRICT_META[category] || DISTRICT_META['Infrastructure'];
}
