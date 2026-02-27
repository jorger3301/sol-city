"use client";

import { AppProvider } from "@solana/connector";
import type { ReactNode } from "react";

export default function SolanaProvider({ children }: { children: ReactNode }) {
  return (
    <AppProvider>
      {children}
    </AppProvider>
  );
}
