"use client";

import SolFace from "@/components/SolFace";

interface ResidentAvatarProps {
  walletAddress: string;
  size: "xs" | "sm" | "md" | "lg";
  houseColor?: string | null;
  className?: string;
  interactive?: boolean;
}

const SIZE_MAP = { xs: 20, sm: 28, md: 40, lg: 48 };
const DEFAULT_HOUSE_COLOR = "#6090e0";

export default function ResidentAvatar({
  walletAddress,
  size,
  houseColor,
  className = "",
  interactive = true,
}: ResidentAvatarProps) {
  const px = SIZE_MAP[size];
  const borderWidth = size === "xs" ? 1 : 2;
  const borderColor = houseColor || DEFAULT_HOUSE_COLOR;
  const innerSize = px - borderWidth * 2;

  return (
    <div
      className={`inline-flex flex-shrink-0 ${className}`}
      style={{
        width: px,
        height: px,
        border: `${borderWidth}px solid ${borderColor}`,
      }}
    >
      <SolFace
        walletAddress={walletAddress}
        size={innerSize}
        enableBlink={interactive}
      />
    </div>
  );
}
