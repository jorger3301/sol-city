"use client";

import { Facehash } from "facehash";

interface ResidentAvatarProps {
  walletAddress: string;
  size: "xs" | "sm" | "md" | "lg";
  houseColor?: string | null;
  className?: string;
  interactive?: boolean;
}

const SIZE_MAP = { xs: 20, sm: 28, md: 40, lg: 48 };
const SOL_CITY_COLORS = ["#c8e64a", "#6090e0", "#14F195", "#e8dcc8", "#f85149"];
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

  return (
    <div
      className={`inline-flex flex-shrink-0 ${className}`}
      style={{
        width: px,
        height: px,
        border: `${borderWidth}px solid ${borderColor}`,
      }}
    >
      <Facehash
        name={walletAddress}
        size={px - borderWidth * 2}
        variant="solid"
        intensity3d="subtle"
        showInitial={false}
        interactive={interactive}
        enableBlink={interactive}
        colors={SOL_CITY_COLORS}
      />
    </div>
  );
}
