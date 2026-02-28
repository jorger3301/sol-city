"use client";

const MOBILE_WALLETS = [
  {
    name: "Phantom",
    color: "#ab9ff2",
    browse: (href: string) =>
      `https://phantom.app/ul/browse/${encodeURIComponent(href)}`,
  },
  {
    name: "Solflare",
    color: "#fc9c1c",
    browse: (href: string) =>
      `https://solflare.com/ul/v1/browse/${encodeURIComponent(href)}?ref=${encodeURIComponent(href)}`,
  },
];

interface Props {
  onClose: () => void;
}

export default function MobileWalletPicker({ onClose }: Props) {
  const href = typeof window !== "undefined" ? window.location.href : "";

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
          Open in wallet
        </p>

        <div className="flex flex-col gap-2">
          {MOBILE_WALLETS.map((w) => (
            <a
              key={w.name}
              href={w.browse(href)}
              className="flex items-center gap-2.5 border border-border px-3 py-2.5 text-[11px] text-cream transition-colors hover:border-border-light hover:bg-raised active:bg-raised"
            >
              <span
                className="h-3 w-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: w.color }}
              />
              {w.name}
            </a>
          ))}
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
