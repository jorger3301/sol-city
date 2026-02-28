"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  useWallet,
  useConnectWallet,
  useDisconnectWallet,
  useWalletConnectors,
  useTransactionSigner,
} from "@solana/connector";
import bs58 from "bs58";
import type { WalletData } from "@/lib/api/types";

interface ProtocolInteraction {
  protocol_slug: string;
  tx_count: number;
}

export interface WalletAuthState {
  address: string | null;
  isConnected: boolean;
  isResident: boolean;
  houseColor: string | null;
  walletData: WalletData | null;
  interactedProtocols: ProtocolInteraction[];
  connecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

const SIGN_MESSAGE = "Sign in to Sol City";

export function useWalletAuth(): WalletAuthState {
  const wallet = useWallet();
  const { connect: walletConnect } = useConnectWallet();
  const { disconnect: walletDisconnect } = useDisconnectWallet();
  const connectors = useWalletConnectors();
  const { signer } = useTransactionSigner();

  const [address, setAddress] = useState<string | null>(null);
  const [isResident, setIsResident] = useState(false);
  const [houseColor, setHouseColor] = useState<string | null>(null);
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [interactedProtocols, setInteractedProtocols] = useState<ProtocolInteraction[]>([]);
  const [connecting, setConnecting] = useState(false);

  const initializedRef = useRef(false);
  const authingRef = useRef(false);

  // On mount: check for existing wallet session cookie
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    fetch("/api/auth/wallet")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.authenticated && data.address) {
          setAddress(data.address);
          loadResidentData(data.address);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadResidentData = useCallback(async (addr: string) => {
    try {
      const res = await fetch(`/api/resident/${addr}`);
      if (res.ok) {
        const data = await res.json();
        if (data.resident) {
          setIsResident(true);
          setHouseColor(data.resident.house_color ?? null);
          setInteractedProtocols(data.interactions ?? []);
        }
      }

      const walletRes = await fetch(`/api/wallet/${addr}`);
      if (walletRes.ok) {
        const wData = await walletRes.json();
        setWalletData(wData.wallet ?? wData);
      }
    } catch {
      // Data is optional
    }
  }, []);

  const connect = useCallback(async () => {
    const first = connectors[0];
    if (!first) return;
    setConnecting(true);
    try {
      await walletConnect(first.id);
    } catch {
      setConnecting(false);
    }
  }, [connectors, walletConnect]);

  // When wallet connects and signer becomes available, sign message + create session
  useEffect(() => {
    if (
      !wallet.isConnected ||
      !wallet.account ||
      !connecting ||
      authingRef.current
    ) {
      return;
    }

    authingRef.current = true;
    const walletAddr = wallet.account as string;

    const authenticate = async () => {
      try {
        const messageBytes = new TextEncoder().encode(SIGN_MESSAGE);
        let signatureB58: string;

        // Use the transaction signer's signMessage if available
        if (signer?.signMessage) {
          const sigBytes = await signer.signMessage(messageBytes);
          signatureB58 = bs58.encode(sigBytes);
        } else {
          // Wallet doesn't support signMessage — skip signature verification
          // Server-side will still validate the address format
          signatureB58 = "";
        }

        if (!signatureB58) {
          // Can't verify — disconnect
          await walletDisconnect();
          setConnecting(false);
          authingRef.current = false;
          return;
        }

        // Verify on server + create session
        const res = await fetch("/api/auth/wallet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address: walletAddr,
            message: SIGN_MESSAGE,
            signature: signatureB58,
          }),
        });

        if (!res.ok) {
          await walletDisconnect();
          setConnecting(false);
          authingRef.current = false;
          return;
        }

        setAddress(walletAddr);

        // Auto-claim resident if not already
        const residentRes = await fetch(`/api/resident/${walletAddr}`);
        if (residentRes.ok) {
          const data = await residentRes.json();
          if (data.resident) {
            setIsResident(true);
            setInteractedProtocols(data.interactions ?? []);
          } else {
            const claimRes = await fetch("/api/resident/claim", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ address: walletAddr }),
            });
            if (claimRes.ok) {
              const claimData = await claimRes.json();
              setIsResident(true);
              setInteractedProtocols(claimData.interactions ?? []);
            }
          }
        }

        // Fetch wallet portfolio
        await loadResidentData(walletAddr);
      } catch {
        // Connection/signing failed
      } finally {
        setConnecting(false);
        authingRef.current = false;
      }
    };

    authenticate();
  }, [wallet.isConnected, wallet.account, signer, connecting, walletDisconnect, loadResidentData]);

  const disconnect = useCallback(async () => {
    try {
      await walletDisconnect();
      await fetch("/api/auth/wallet", { method: "DELETE" });
    } catch {
      // Ignore
    }
    setAddress(null);
    setIsResident(false);
    setHouseColor(null);
    setWalletData(null);
    setInteractedProtocols([]);
  }, [walletDisconnect]);

  return {
    address,
    isConnected: !!address,
    isResident,
    houseColor,
    walletData,
    interactedProtocols,
    connecting,
    connect,
    disconnect,
  };
}
