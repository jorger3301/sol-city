// ═══════════════════════════════════════════════════
// SOL FACE — Deterministic avatar trait generator
// ═══════════════════════════════════════════════════

// ─── Types ────────────────────────────────────────

export interface SolFaceTraits {
  faceShape: number;   // 0-3
  skinColor: number;   // 0-5
  eyeStyle: number;    // 0-7
  eyeColor: number;    // 0-4
  eyebrows: number;    // 0-4
  nose: number;        // 0-3
  mouth: number;       // 0-5
  hairStyle: number;   // 0-7
  hairColor: number;   // 0-7
  accessory: number;   // 0-5 (0-1 = none, 2-5 = items)
  bgColor: number;     // 0-4
}

// ─── Color Palettes ──────────────────────────────

export const SKIN_COLORS = [
  "#ffd5b0", "#f4c794", "#e0a370",
  "#c68642", "#8d5524", "#4a2c17",
];

export const EYE_COLORS = [
  "#3d2b1f", // dark brown
  "#4a80c4", // blue
  "#5a9a5a", // green
  "#c89430", // amber
  "#8a8a8a", // gray
];

export const HAIR_COLORS = [
  "#1a1a1a", // black
  "#6b3a2a", // brown
  "#d4a844", // blonde
  "#c44a20", // ginger
  "#c8e64a", // neon lime
  "#6090e0", // neon blue
  "#14F195", // neon mint
  "#e040c0", // neon magenta
];

export const BG_COLORS = [
  "#c8e64a", "#6090e0", "#14F195", "#e8dcc8", "#f85149",
];

// ─── Hashing (djb2) ─────────────────────────────

function djb2(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

// ─── PRNG (mulberry32) ──────────────────────────

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Trait Generation ───────────────────────────

export function generateTraits(walletAddress: string): SolFaceTraits {
  const seed = djb2(walletAddress);
  const rand = mulberry32(seed);

  return {
    faceShape:  Math.floor(rand() * 4),
    skinColor:  Math.floor(rand() * 6),
    eyeStyle:   Math.floor(rand() * 8),
    eyeColor:   Math.floor(rand() * 5),
    eyebrows:   Math.floor(rand() * 5),
    nose:       Math.floor(rand() * 4),
    mouth:      Math.floor(rand() * 6),
    hairStyle:  Math.floor(rand() * 8),
    hairColor:  Math.floor(rand() * 8),
    accessory:  Math.floor(rand() * 6),
    bgColor:    Math.floor(rand() * 5),
  };
}
