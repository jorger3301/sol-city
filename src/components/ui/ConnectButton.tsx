"use client";

import { useWallet, useConnectWallet, useDisconnectWallet, useWalletConnectors } from "@solana/connector";
import { truncateAddress } from "@/lib/api/utils";
import { useState } from "react";
import WalletPicker from "@/components/ui/WalletPicker";

interface Props {
  accent: string;
  shadow: string;
}

export default function ConnectButton({ accent, shadow }: Props) {
  const { account, isConnected } = useWallet();
  const { connect } = useConnectWallet();
  const { disconnect } = useDisconnectWallet();
  const connectors = useWalletConnectors();
  const [error, setError] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  const handleConnect = async () => {
    setError(null);
    const first = connectors[0];
    if (!first) {
      setShowPicker(true);
      return;
    }
    try {
      await connect(first.id);
    } catch {
      setShowPicker(true);
    }
  };

  if (isConnected && account) {
    return (
      <div className="flex items-center gap-2">
        <span
          className="flex items-center gap-1.5 border-[3px] border-border bg-bg/80 px-3 py-1.5 text-[10px] text-cream normal-case backdrop-blur-sm"
        >
          {truncateAddress(account)}
        </span>
        <button
          onClick={() => disconnect()}
          className="border-[2px] border-border bg-bg/80 px-2 py-1 text-[9px] text-muted backdrop-blur-sm transition-colors hover:text-cream hover:border-border-light"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col items-center gap-1">
        <button
          onClick={handleConnect}
          className="btn-press px-3 py-1.5 text-[10px] text-bg"
          style={{
            backgroundColor: accent,
            boxShadow: `2px 2px 0 0 ${shadow}`,
          }}
        >
          Connect Wallet
        </button>
        {error && (
          <p className="text-[9px] text-[#f85149]">{error}</p>
        )}
      </div>
      {showPicker && (
        <WalletPicker onClose={() => setShowPicker(false)} />
      )}
    </>
  );
}
