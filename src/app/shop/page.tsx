export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { getWalletSession } from "@/lib/wallet-session";
import { getSupabaseAdmin } from "@/lib/supabase";
import SignInButton from "./sign-in-button";
import HouseColorPicker from "./house-color-picker";

export const metadata: Metadata = {
  title: "Shop - Sol City",
  description: "Customize your building in Sol City with effects, structures and more",
};

const ACCENT = "#c8e64a";

export default async function ShopLanding() {
  const walletAddress = await getWalletSession();

  let houseColor: string | null = null;
  let isResident = false;
  if (walletAddress) {
    const sb = getSupabaseAdmin();
    const { data } = await sb
      .from("wallet_residents")
      .select("house_color")
      .eq("wallet_address", walletAddress)
      .single();
    if (data) {
      isResident = true;
      houseColor = data.house_color ?? null;
    }
  }

  return (
    <main className="min-h-screen bg-bg font-pixel uppercase text-warm">
      <div className="mx-auto max-w-lg px-3 py-6 sm:px-4 sm:py-10">
        {/* Back */}
        <Link
          href="/"
          className="mb-6 inline-block text-sm text-muted transition-colors hover:text-cream sm:mb-8"
        >
          &larr; Back to City
        </Link>

        <div className="border-[3px] border-border bg-bg-raised p-6 sm:p-10">
          <h1 className="text-center text-xl text-cream sm:text-2xl">
            Sol City <span style={{ color: ACCENT }}>Shop</span>
          </h1>

          <p className="mt-4 text-center text-[10px] leading-relaxed text-muted normal-case">
            Customize your resident profile with effects, structures and identity items.
            Make your presence stand out in the city.
          </p>

          {/* How it works */}
          <div className="mt-6 space-y-3">
            <h2 className="text-xs" style={{ color: ACCENT }}>
              How it works
            </h2>
            <div className="space-y-2 text-[10px] text-muted normal-case">
              <div className="flex gap-3 border-[2px] border-border bg-bg-card px-4 py-3">
                <span style={{ color: ACCENT }}>1.</span>
                <span>
                  <span className="text-cream">Connect your wallet</span> to
                  become a resident
                </span>
              </div>
              <div className="flex gap-3 border-[2px] border-border bg-bg-card px-4 py-3">
                <span style={{ color: ACCENT }}>2.</span>
                <span>
                  Explore your{" "}
                  <span className="text-cream">on-chain activity</span> across
                  Solana protocols
                </span>
              </div>
              <div className="flex gap-3 border-[2px] border-border bg-bg-card px-4 py-3">
                <span style={{ color: ACCENT }}>3.</span>
                <span>
                  Browse the shop and buy items to{" "}
                  <span className="text-cream">customize</span> your resident
                  profile
                </span>
              </div>
            </div>
          </div>

          {/* Connect wallet / Connected state */}
          <div className="mt-8 flex flex-col items-center gap-3">
            {walletAddress ? (
              <p className="text-xs text-cream normal-case">
                Connected:{" "}
                <span style={{ color: ACCENT }}>
                  {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
                </span>
              </p>
            ) : (
              <>
                <SignInButton accent={ACCENT} />
                <p className="text-[8px] text-dim normal-case">
                  Connect your Solana wallet to get started
                </p>
              </>
            )}
          </div>
        </div>

        {/* House color customization for residents */}
        {walletAddress && isResident && (
          <div className="mt-6">
            <HouseColorPicker accent={ACCENT} currentColor={houseColor} />
          </div>
        )}

      </div>
    </main>
  );
}
