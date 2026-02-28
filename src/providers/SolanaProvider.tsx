"use client";

import { useMemo } from "react";
import {
  AppProvider,
  getDefaultConfig,
  getDefaultMobileConfig,
} from "@solana/connector";
import type { ReactNode } from "react";

export default function SolanaProvider({ children }: { children: ReactNode }) {
  const connectorConfig = useMemo(
    () =>
      getDefaultConfig({
        appName: "Sol City",
        appUrl: "https://solcity.xyz",
        autoConnect: true,
        enableMobile: true,
        network: "mainnet-beta",
      }),
    [],
  );

  const mobile = useMemo(
    () =>
      getDefaultMobileConfig({
        appName: "Sol City",
        appUrl: "https://solcity.xyz",
        network: "mainnet-beta",
      }),
    [],
  );

  return (
    <AppProvider connectorConfig={connectorConfig} mobile={mobile}>
      {children}
    </AppProvider>
  );
}
