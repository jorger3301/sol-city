"use client";

import { SolFace as SolFaceBase } from "solfaces/react";
import { solCityTheme } from "@/lib/sol-city-theme";

interface SolFaceProps {
  walletAddress: string;
  size: number;
  enableBlink?: boolean;
}

export default function SolFace({ walletAddress, size, enableBlink = false }: SolFaceProps) {
  return (
    <SolFaceBase
      walletAddress={walletAddress}
      size={size}
      theme={solCityTheme}
      enableBlink={enableBlink}
    />
  );
}
