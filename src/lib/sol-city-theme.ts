// ═══════════════════════════════════════════════════
// Sol City theme for SolFaces
// Pixel-retro style matching the city's dark pixel aesthetic
// ═══════════════════════════════════════════════════

import type { SolFaceTheme } from "solfaces";

export const solCityTheme: SolFaceTheme = {
  // Pixel art rendering (React-only)
  _pixel: true,
  _pixelDensity: 14,
  _pixelScanlines: true,
  _pixelOutline: true,

  // Dark background matching Sol City's bg
  bgColors: [
    "#c8e64a", // neon lime (accent)
    "#6090e0", // neon blue
    "#14F195", // neon mint
    "#e8dcc8", // cream
    "#f85149", // red
  ],
  bgOpacity: 0.15,
  bgRadius: 0, // sharp pixel corners

  // Use Sol City brand colors in hair
  hairColors: [
    "#1a1a1a", // black
    "#6b3a2a", // brown
    "#d4a844", // blonde
    "#c44a20", // ginger
    "#c8e64a", // neon lime (accent)
    "#6090e0", // neon blue
    "#14F195", // neon mint
    "#e040c0", // neon magenta
    "#f85149", // red
    "#d4cfc4", // cream
  ],

  // Flat rendering — no gradients, pixel-clean
  flat: true,
  cheekEnabled: false,
  shadowEnabled: false,

  // Dark pixel outline
  border: { color: "#222", width: 2 },
};
