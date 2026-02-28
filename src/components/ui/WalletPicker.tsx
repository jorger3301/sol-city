"use client";

import { useWalletConnectors, type WalletConnectorId } from "@solana/connector";

function PhantomIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 108 108"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="flex-shrink-0 rounded-[4px]"
    >
      <rect width="108" height="108" rx="26" fill="#AB9FF2" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M46.5267 69.9229C42.0054 76.8509 34.4292 85.6182 24.348 85.6182C19.5824 85.6182 15 83.6563 15 75.1342C15 53.4305 44.6326 19.8327 72.1268 19.8327C87.768 19.8327 94 30.6846 94 43.0079C94 58.8258 83.7355 76.9122 73.5321 76.9122C70.2939 76.9122 68.7053 75.1342 68.7053 72.314C68.7053 71.5783 68.8275 70.7812 69.0719 69.9229C65.5893 75.8699 58.8685 81.3878 52.5754 81.3878C47.993 81.3878 45.6713 78.5063 45.6713 74.4598C45.6713 72.9884 45.9768 71.4556 46.5267 69.9229ZM83.6761 42.5794C83.6761 46.1704 81.5575 47.9658 79.1875 47.9658C76.7816 47.9658 74.6989 46.1704 74.6989 42.5794C74.6989 38.9885 76.7816 37.1931 79.1875 37.1931C81.5575 37.1931 83.6761 38.9885 83.6761 42.5794ZM70.2103 42.5795C70.2103 46.1704 68.0916 47.9658 65.7216 47.9658C63.3157 47.9658 61.233 46.1704 61.233 42.5795C61.233 38.9885 63.3157 37.1931 65.7216 37.1931C68.0916 37.1931 70.2103 38.9885 70.2103 42.5795Z"
        fill="#FFFDF8"
      />
    </svg>
  );
}

function SolflareIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 50 50"
      xmlns="http://www.w3.org/2000/svg"
      className="flex-shrink-0 rounded-[4px]"
    >
      <rect width="50" height="50" rx="12" ry="12" fill="#ffef46" />
      <path
        d="M24.23,26.42l2.46-2.38,4.59,1.5c3.01,1,4.51,2.84,4.51,5.43,0,1.96-.75,3.26-2.25,4.93l-.46.5.17-1.17c.67-4.26-.58-6.09-4.72-7.43l-4.3-1.38h0ZM18.05,11.85l12.52,4.17-2.71,2.59-6.51-2.17c-2.25-.75-3.01-1.96-3.3-4.51v-.08h0ZM17.3,33.06l2.84-2.71,5.34,1.75c2.8.92,3.76,2.13,3.46,5.18l-11.65-4.22h0ZM13.71,20.95c0-.79.42-1.54,1.13-2.17.75,1.09,2.05,2.05,4.09,2.71l4.42,1.46-2.46,2.38-4.34-1.42c-2-.67-2.84-1.67-2.84-2.96M26.82,42.87c9.18-6.09,14.11-10.23,14.11-15.32,0-3.38-2-5.26-6.43-6.72l-3.34-1.13,9.14-8.77-1.84-1.96-2.71,2.38-12.81-4.22c-3.97,1.29-8.97,5.09-8.97,8.89,0,.42.04.83.17,1.29-3.3,1.88-4.63,3.63-4.63,5.8,0,2.05,1.09,4.09,4.55,5.22l2.75.92-9.52,9.14,1.84,1.96,2.96-2.71,14.73,5.22h0Z"
        fill="#02050a"
      />
    </svg>
  );
}

function isMobile(): boolean {
  if (typeof window === "undefined") return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

const WALLETS = [
  {
    name: "Phantom",
    icon: PhantomIcon,
    match: ["phantom"],
    mobileBrowse: (href: string) =>
      `https://phantom.app/ul/browse/${encodeURIComponent(href)}`,
    extensionUrl: "https://phantom.app/download",
  },
  {
    name: "Solflare",
    icon: SolflareIcon,
    match: ["solflare"],
    mobileBrowse: (href: string) =>
      `https://solflare.com/ul/v1/browse/${encodeURIComponent(href)}?ref=${encodeURIComponent(href)}`,
    extensionUrl: "https://solflare.com/download",
  },
];

interface Props {
  onClose: () => void;
  onConnect?: (connectorId: WalletConnectorId) => void;
}

export default function WalletPicker({ onClose, onConnect }: Props) {
  const href = typeof window !== "undefined" ? window.location.href : "";
  const mobile = isMobile();
  const connectors = useWalletConnectors();

  const handleClick = (wallet: (typeof WALLETS)[number]) => {
    if (mobile) return; // handled by <a> tag

    // Find a matching installed connector
    const connector = connectors.find((c) => {
      const id = (c.id ?? "").toLowerCase();
      const name = ((c as { name?: string }).name ?? "").toLowerCase();
      return wallet.match.some((m) => id.includes(m) || name.includes(m));
    });

    if (connector && onConnect) {
      onConnect(connector.id);
    } else {
      window.open(wallet.extensionUrl, "_blank");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="mx-4 w-full max-w-[260px] border-2 border-border bg-card p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="mb-3 text-center text-[11px] text-cream">
          {mobile ? "Open in wallet" : "Connect wallet"}
        </p>

        <div className="flex flex-col gap-2">
          {WALLETS.map((w) =>
            mobile ? (
              <a
                key={w.name}
                href={w.mobileBrowse(href)}
                className="flex items-center gap-2.5 border border-border px-3 py-2.5 text-[11px] text-cream transition-colors hover:border-border-light hover:bg-raised active:bg-raised"
              >
                <w.icon size={16} />
                {w.name}
              </a>
            ) : (
              <button
                key={w.name}
                onClick={() => handleClick(w)}
                className="flex items-center gap-2.5 border border-border px-3 py-2.5 text-[11px] text-cream transition-colors hover:border-border-light hover:bg-raised active:bg-raised text-left"
              >
                <w.icon size={16} />
                {w.name}
              </button>
            ),
          )}
        </div>

        <button
          onClick={onClose}
          className="mt-3 w-full py-1.5 text-[9px] text-muted transition-colors hover:text-cream"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
