"use client";

import { useWalletAuth } from "@/lib/useWalletAuth";
import { trackSignInClicked } from "@/lib/himetrica";

export default function SignInButton({ accent }: { accent: string }) {
  const { connect, connecting } = useWalletAuth();

  const handleConnect = async () => {
    trackSignInClicked("shop");
    await connect();
  };

  return (
    <button
      onClick={handleConnect}
      disabled={connecting}
      className="btn-press flex items-center gap-2 px-8 py-3.5 text-sm text-bg"
      style={{
        backgroundColor: accent,
        boxShadow: "4px 4px 0 0 #5a7a00",
      }}
    >
      {connecting ? "Connecting..." : "Connect Wallet"}
    </button>
  );
}
