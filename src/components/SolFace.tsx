"use client";

import { useMemo } from "react";
import {
  generateTraits,
  SKIN_COLORS,
  EYE_COLORS,
  HAIR_COLORS,
  BG_COLORS,
  type SolFaceTraits,
} from "@/lib/sol-face";

interface SolFaceProps {
  walletAddress: string;
  size: number;
  enableBlink?: boolean;
}

// ─── Face Shape ─────────────────────────────────

function renderFace(traits: SolFaceTraits, skin: string) {
  switch (traits.faceShape) {
    case 0:
      return <circle cx="32" cy="34" r="20" fill={skin} />;
    case 1:
      return <rect x="12" y="14" width="40" height="40" rx="8" ry="8" fill={skin} />;
    case 2:
      return <ellipse cx="32" cy="34" rx="18" ry="22" fill={skin} />;
    case 3:
      return (
        <path
          d="M32 12 L50 24 L50 44 L32 56 L14 44 L14 24 Z"
          fill={skin}
          strokeLinejoin="round"
        />
      );
    default:
      return <circle cx="32" cy="34" r="20" fill={skin} />;
  }
}

// ─── Eyes ────────────────────────────────────────

function renderEyes(traits: SolFaceTraits, eyeCol: string) {
  const lx = 24, rx = 40, y = 30;

  switch (traits.eyeStyle) {
    case 0: // Round
      return (
        <>
          <circle cx={lx} cy={y} r="3.5" fill="white" />
          <circle cx={lx + 1} cy={y} r="2" fill={eyeCol} />
          <circle cx={rx} cy={y} r="3.5" fill="white" />
          <circle cx={rx + 1} cy={y} r="2" fill={eyeCol} />
        </>
      );
    case 1: // Dots
      return (
        <>
          <circle cx={lx} cy={y} r="2" fill={eyeCol} />
          <circle cx={rx} cy={y} r="2" fill={eyeCol} />
        </>
      );
    case 2: // Almond
      return (
        <>
          <ellipse cx={lx} cy={y} rx="4" ry="2.5" fill="white" />
          <circle cx={lx + 0.5} cy={y} r="1.5" fill={eyeCol} />
          <ellipse cx={rx} cy={y} rx="4" ry="2.5" fill="white" />
          <circle cx={rx + 0.5} cy={y} r="1.5" fill={eyeCol} />
        </>
      );
    case 3: // Wide
      return (
        <>
          <circle cx={lx} cy={y} r="4.5" fill="white" />
          <circle cx={lx} cy={y + 0.5} r="2.5" fill={eyeCol} />
          <circle cx={rx} cy={y} r="4.5" fill="white" />
          <circle cx={rx} cy={y + 0.5} r="2.5" fill={eyeCol} />
        </>
      );
    case 4: // Sleepy
      return (
        <>
          <ellipse cx={lx} cy={y + 1} rx="3.5" ry="2" fill="white" />
          <circle cx={lx} cy={y + 1} r="1.5" fill={eyeCol} />
          <line x1={lx - 4} y1={y - 0.5} x2={lx + 4} y2={y - 0.5}
            stroke={eyeCol} strokeWidth="1" strokeLinecap="round" />
          <ellipse cx={rx} cy={y + 1} rx="3.5" ry="2" fill="white" />
          <circle cx={rx} cy={y + 1} r="1.5" fill={eyeCol} />
          <line x1={rx - 4} y1={y - 0.5} x2={rx + 4} y2={y - 0.5}
            stroke={eyeCol} strokeWidth="1" strokeLinecap="round" />
        </>
      );
    case 5: // Winking
      return (
        <>
          <path d={`M${lx - 3} ${y} Q${lx} ${y + 3} ${lx + 3} ${y}`}
            fill="none" stroke={eyeCol} strokeWidth="1.5" strokeLinecap="round" />
          <circle cx={rx} cy={y} r="3.5" fill="white" />
          <circle cx={rx + 1} cy={y} r="2" fill={eyeCol} />
        </>
      );
    case 6: // Lashes
      return (
        <>
          <circle cx={lx} cy={y} r="3" fill="white" />
          <circle cx={lx + 0.5} cy={y} r="1.5" fill={eyeCol} />
          <line x1={lx + 2} y1={y - 3} x2={lx + 3.5} y2={y - 4.5}
            stroke={eyeCol} strokeWidth="0.8" strokeLinecap="round" />
          <line x1={lx + 3} y1={y - 2} x2={lx + 4.5} y2={y - 3}
            stroke={eyeCol} strokeWidth="0.8" strokeLinecap="round" />
          <circle cx={rx} cy={y} r="3" fill="white" />
          <circle cx={rx + 0.5} cy={y} r="1.5" fill={eyeCol} />
          <line x1={rx + 2} y1={y - 3} x2={rx + 3.5} y2={y - 4.5}
            stroke={eyeCol} strokeWidth="0.8" strokeLinecap="round" />
          <line x1={rx + 3} y1={y - 2} x2={rx + 4.5} y2={y - 3}
            stroke={eyeCol} strokeWidth="0.8" strokeLinecap="round" />
        </>
      );
    case 7: // Narrow
      return (
        <>
          <ellipse cx={lx} cy={y} rx="4" ry="1.2" fill="white" />
          <ellipse cx={lx + 0.5} cy={y} rx="2" ry="1" fill={eyeCol} />
          <ellipse cx={rx} cy={y} rx="4" ry="1.2" fill="white" />
          <ellipse cx={rx + 0.5} cy={y} rx="2" ry="1" fill={eyeCol} />
        </>
      );
    default:
      return (
        <>
          <circle cx={lx} cy={y} r="3" fill="white" />
          <circle cx={lx + 1} cy={y} r="2" fill={eyeCol} />
          <circle cx={rx} cy={y} r="3" fill="white" />
          <circle cx={rx + 1} cy={y} r="2" fill={eyeCol} />
        </>
      );
  }
}

// ─── Eyebrows ───────────────────────────────────

function renderEyebrows(traits: SolFaceTraits) {
  const lx = 24, rx = 40, y = 25;
  const col = "#2a2020";

  switch (traits.eyebrows) {
    case 0:
      return null;
    case 1: // Thin
      return (
        <>
          <line x1={lx - 3} y1={y} x2={lx + 3} y2={y}
            stroke={col} strokeWidth="0.8" strokeLinecap="round" />
          <line x1={rx - 3} y1={y} x2={rx + 3} y2={y}
            stroke={col} strokeWidth="0.8" strokeLinecap="round" />
        </>
      );
    case 2: // Thick
      return (
        <>
          <line x1={lx - 3.5} y1={y} x2={lx + 3.5} y2={y}
            stroke={col} strokeWidth="2" strokeLinecap="round" />
          <line x1={rx - 3.5} y1={y} x2={rx + 3.5} y2={y}
            stroke={col} strokeWidth="2" strokeLinecap="round" />
        </>
      );
    case 3: // Arched
      return (
        <>
          <path d={`M${lx - 3.5} ${y + 1} Q${lx} ${y - 2} ${lx + 3.5} ${y + 1}`}
            fill="none" stroke={col} strokeWidth="1" strokeLinecap="round" />
          <path d={`M${rx - 3.5} ${y + 1} Q${rx} ${y - 2} ${rx + 3.5} ${y + 1}`}
            fill="none" stroke={col} strokeWidth="1" strokeLinecap="round" />
        </>
      );
    case 4: // Angled
      return (
        <>
          <line x1={lx - 3} y1={y - 1} x2={lx + 3} y2={y + 1}
            stroke={col} strokeWidth="1.2" strokeLinecap="round" />
          <line x1={rx - 3} y1={y + 1} x2={rx + 3} y2={y - 1}
            stroke={col} strokeWidth="1.2" strokeLinecap="round" />
        </>
      );
    default:
      return null;
  }
}

// ─── Nose ───────────────────────────────────────

function renderNose(traits: SolFaceTraits, skin: string) {
  const cx = 32, y = 36;
  const shadow = skin + "aa";

  switch (traits.nose) {
    case 0:
      return null;
    case 1: // Dot
      return <circle cx={cx} cy={y} r="1.5" fill={shadow} />;
    case 2: // Triangle
      return (
        <path
          d={`M${cx} ${y - 1.5} L${cx + 2.5} ${y + 2} L${cx - 2.5} ${y + 2} Z`}
          fill={shadow}
        />
      );
    case 3: // Button (nostrils)
      return (
        <>
          <circle cx={cx - 1.5} cy={y} r="1" fill={shadow} />
          <circle cx={cx + 1.5} cy={y} r="1" fill={shadow} />
        </>
      );
    default:
      return null;
  }
}

// ─── Mouth ──────────────────────────────────────

function renderMouth(traits: SolFaceTraits) {
  const cx = 32, y = 42;
  const col = "#c05050";

  switch (traits.mouth) {
    case 0: // Smile
      return (
        <path d={`M${cx - 4} ${y} Q${cx} ${y + 4} ${cx + 4} ${y}`}
          fill="none" stroke={col} strokeWidth="1.2" strokeLinecap="round" />
      );
    case 1: // Neutral
      return (
        <line x1={cx - 3} y1={y + 1} x2={cx + 3} y2={y + 1}
          stroke={col} strokeWidth="1.2" strokeLinecap="round" />
      );
    case 2: // Grin
      return (
        <path d={`M${cx - 6} ${y} Q${cx} ${y + 5} ${cx + 6} ${y}`}
          fill="none" stroke={col} strokeWidth="1.5" strokeLinecap="round" />
      );
    case 3: // Open
      return (
        <ellipse cx={cx} cy={y + 1} rx="3" ry="2.5" fill={col} opacity="0.8" />
      );
    case 4: // Smirk
      return (
        <path d={`M${cx - 4} ${y + 1} Q${cx - 1} ${y + 1} ${cx + 4} ${y - 1}`}
          fill="none" stroke={col} strokeWidth="1.2" strokeLinecap="round" />
      );
    case 5: // Wide smile
      return (
        <path d={`M${cx - 6} ${y} Q${cx} ${y + 6} ${cx + 6} ${y}`}
          fill="white" stroke={col} strokeWidth="1" />
      );
    default:
      return (
        <path d={`M${cx - 4} ${y} Q${cx} ${y + 4} ${cx + 4} ${y}`}
          fill="none" stroke={col} strokeWidth="1.2" strokeLinecap="round" />
      );
  }
}

// ─── Hair ───────────────────────────────────────

function renderHair(traits: SolFaceTraits, hairCol: string) {
  switch (traits.hairStyle) {
    case 0: // Bald
      return null;
    case 1: // Short
      return <rect x="14" y="12" width="36" height="12" rx="6" ry="6" fill={hairCol} />;
    case 2: // Spiky
      return (
        <g fill={hairCol}>
          <rect x="14" y="16" width="36" height="8" rx="2" />
          <polygon points="18,16 22,6 26,16" />
          <polygon points="26,16 30,4 34,16" />
          <polygon points="34,16 38,6 42,16" />
          <polygon points="42,16 46,10 48,16" />
        </g>
      );
    case 3: // Swept
      return (
        <g fill={hairCol}>
          <rect x="14" y="14" width="36" height="10" rx="4" />
          <path d="M14 18 Q8 14 10 8 Q14 10 20 14 Z" />
        </g>
      );
    case 4: // Mohawk
      return <rect x="26" y="4" width="12" height="20" rx="4" ry="2" fill={hairCol} />;
    case 5: // Long
      return (
        <g fill={hairCol}>
          <rect x="14" y="12" width="36" height="10" rx="4" />
          <rect x="10" y="18" width="8" height="24" rx="3" />
          <rect x="46" y="18" width="8" height="24" rx="3" />
        </g>
      );
    case 6: // Bob
      return (
        <path
          d="M12 22 Q12 10 32 10 Q52 10 52 22 L52 38 Q52 42 48 42 L48 26 Q48 16 32 16 Q16 16 16 26 L16 42 Q12 42 12 38 Z"
          fill={hairCol}
        />
      );
    case 7: // Buzz
      return <rect x="15" y="13" width="34" height="9" rx="8" ry="4" fill={hairCol} opacity="0.7" />;
    default:
      return null;
  }
}

// ─── Accessories ────────────────────────────────

function renderAccessory(traits: SolFaceTraits) {
  switch (traits.accessory) {
    case 0:
    case 1:
      return null;
    case 2: // Round glasses
      return (
        <g fill="none" stroke="#444" strokeWidth="1">
          <circle cx="24" cy="30" r="5" />
          <circle cx="40" cy="30" r="5" />
          <line x1="29" y1="30" x2="35" y2="30" />
          <line x1="19" y1="30" x2="14" y2="28" />
          <line x1="45" y1="30" x2="50" y2="28" />
        </g>
      );
    case 3: // Square glasses
      return (
        <g fill="none" stroke="#444" strokeWidth="1">
          <rect x="19" y="26" width="10" height="8" rx="1" />
          <rect x="35" y="26" width="10" height="8" rx="1" />
          <line x1="29" y1="30" x2="35" y2="30" />
          <line x1="19" y1="30" x2="14" y2="28" />
          <line x1="45" y1="30" x2="50" y2="28" />
        </g>
      );
    case 4: // Earring
      return (
        <circle cx="11" cy="36" r="2" fill="#f0c060" stroke="#d4a030" strokeWidth="0.5" />
      );
    case 5: // Bandana
      return (
        <g>
          <rect x="12" y="20" width="40" height="4" rx="1" fill="#f85149" />
          <path d="M12 22 L8 26 L12 24 Z" fill="#f85149" />
        </g>
      );
    default:
      return null;
  }
}

// ─── Main Component ─────────────────────────────

export default function SolFace({ walletAddress, size, enableBlink = false }: SolFaceProps) {
  const traits = useMemo(() => generateTraits(walletAddress), [walletAddress]);
  const skin = SKIN_COLORS[traits.skinColor];
  const eyeCol = EYE_COLORS[traits.eyeColor];
  const hairCol = HAIR_COLORS[traits.hairColor];
  const bgCol = BG_COLORS[traits.bgColor];

  const uid = useMemo(() => `sf-${walletAddress.slice(0, 8)}`, [walletAddress]);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      style={{ display: "block" }}
    >
      {enableBlink && (
        <style>{`
          @keyframes ${uid}-blink {
            0%, 90%, 100% { transform: scaleY(1); }
            95% { transform: scaleY(0.1); }
          }
          .${uid}-eyes {
            animation: ${uid}-blink 4s ease-in-out infinite;
            transform-origin: 32px 30px;
          }
        `}</style>
      )}

      <rect x="0" y="0" width="64" height="64" fill={bgCol} opacity="0.15" rx="4" />

      {renderHair(traits, hairCol)}
      {renderFace(traits, skin)}
      <g className={enableBlink ? `${uid}-eyes` : undefined}>
        {renderEyes(traits, eyeCol)}
      </g>
      {renderEyebrows(traits)}
      {renderNose(traits, skin)}
      {renderMouth(traits)}
      {renderAccessory(traits)}
    </svg>
  );
}
