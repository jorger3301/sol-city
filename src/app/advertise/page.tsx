import type { Metadata } from "next";
import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase";
import { AdvertisePageTracker } from "./tracking";
import { AdPurchaseForm } from "./AdPurchaseForm";
import { SuccessBanner } from "./SuccessBanner";

const ACCENT = "#c8e64a";
const SHADOW = "#5a7a00";

export const metadata: Metadata = {
  title: "Advertise on Git City - Sky Ads",
  description:
    "Put your brand in the sky above a 3D city of GitHub developers. Planes, blimps, LED banners, impression tracking, and click analytics.",
  openGraph: {
    title: "Advertise on Git City",
    description:
      "Your brand flying over 1,000+ developer buildings. Planes, blimps, LED banners with full analytics.",
    siteName: "Git City",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    creator: "@samuelrizzondev",
    site: "@samuelrizzondev",
  },
};

async function getStats() {
  const supabase = getSupabaseAdmin();

  const [devResult, impressionResult] = await Promise.all([
    supabase
      .from("developers")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("sky_ad_events")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "impression"),
  ]);

  return {
    devCount: devResult.count ?? 0,
    totalImpressions: impressionResult.count ?? 0,
  };
}

export default async function AdvertisePage() {
  const { devCount, totalImpressions } = await getStats();

  return (
    <main className="min-h-screen bg-bg font-pixel uppercase text-warm">
      <div className="mx-auto max-w-3xl px-4 py-10">
        {/* Nav */}
        <Link
          href="/"
          className="text-xs text-muted transition-colors hover:text-cream"
        >
          &larr; Back to City
        </Link>

        <AdvertisePageTracker />
        <SuccessBanner />

        {/* Hero */}
        <section className="mt-10 text-center">
          <h1 className="text-3xl text-cream md:text-4xl">
            Sky <span style={{ color: ACCENT }}>Ads</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-xs text-muted normal-case">
            Your brand flying over {devCount.toLocaleString()}+ developer
            buildings. Planes, blimps, LED banners, full analytics.
          </p>
          <p className="mt-2 text-[10px] normal-case" style={{ color: ACCENT }}>
            Early adopter pricing. Prices go up as the city grows.
          </p>
        </section>

        {/* Purchase Form */}
        <section className="mt-14">
          <h2 className="text-center text-xl text-cream">
            Pick a <span style={{ color: ACCENT }}>plan</span>
          </h2>
          <p className="mt-2 text-center text-[10px] text-muted normal-case">
            Configure your ad and pay instantly. No account needed.
          </p>

          <div className="mt-6">
            <AdPurchaseForm />
          </div>
        </section>

        {/* What's included */}
        <section className="mt-14">
          <h2 className="text-center text-xl text-cream">
            Every ad <span style={{ color: ACCENT }}>includes</span>
          </h2>

          <div className="mx-auto mt-6 max-w-md border-[3px] border-border p-5">
            <ul className="space-y-3">
              {[
                "Custom text up to 80 characters",
                "Your brand colors on the banner",
                "Clickable link with UTM tracking",
                "Impression + click analytics dashboard",
                "Instant activation after payment",
                "Runs for the full paid duration",
              ].map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-3 text-[10px] text-muted normal-case"
                >
                  <span
                    className="mt-0.5 text-xs"
                    style={{ color: ACCENT }}
                  >
                    +
                  </span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* How it works */}
        <section className="mt-14">
          <h2 className="text-center text-xl text-cream">
            How it <span style={{ color: ACCENT }}>works</span>
          </h2>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              {
                step: "01",
                title: "Configure",
                desc: "Pick plane or blimp, weekly or monthly. Set your banner text, colors, and link.",
              },
              {
                step: "02",
                title: "Pay",
                desc: "Secure checkout via Stripe. Credit card, Apple Pay, Google Pay. No account needed.",
              },
              {
                step: "03",
                title: "Fly",
                desc: "Your ad activates instantly and starts flying over the city. Track impressions and clicks in real time.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="border-[3px] border-border p-5"
              >
                <span
                  className="text-2xl"
                  style={{ color: ACCENT }}
                >
                  {item.step}
                </span>
                <h3 className="mt-2 text-sm text-cream">{item.title}</h3>
                <p className="mt-2 text-[10px] leading-relaxed text-muted normal-case">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Stats */}
        <section className="mt-14">
          <h2 className="text-center text-xl text-cream">
            Real <span style={{ color: ACCENT }}>numbers</span>
          </h2>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="border-[3px] border-border p-5 text-center">
              <p className="text-2xl text-cream md:text-3xl" style={{ color: ACCENT }}>
                {devCount.toLocaleString()}+
              </p>
              <p className="mt-2 text-[10px] text-muted normal-case">
                developer buildings
              </p>
            </div>
            <div className="border-[3px] border-border p-5 text-center">
              <p className="text-2xl text-cream md:text-3xl" style={{ color: ACCENT }}>
                {totalImpressions.toLocaleString()}+
              </p>
              <p className="mt-2 text-[10px] text-muted normal-case">
                ad impressions served
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-14">
          <h2 className="text-center text-xl text-cream">
            <span style={{ color: ACCENT }}>FAQ</span>
          </h2>

          <div className="mx-auto mt-6 max-w-lg space-y-4">
            {[
              {
                q: "How many people will see my ad?",
                a: `The city has ${devCount.toLocaleString()}+ developer buildings and is growing every day. Every visitor sees the sky ads as they fly over the city.`,
              },
              {
                q: "Can I change my ad text during the campaign?",
                a: "Yes. One free text change per week. Just email samuelrizzondev@gmail.com.",
              },
              {
                q: "What if I want to cancel?",
                a: "Refund available within the first 3 days. After that, your ad runs until the end of the paid period.",
              },
              {
                q: "How do I pay?",
                a: "Credit card, Apple Pay, or Google Pay via Stripe. Secure checkout, no account needed.",
              },
              {
                q: "How many slots?",
                a: "3 plane slots and 2 blimp slots for sale. Limited inventory keeps the sky clean and your ad visible.",
              },
              {
                q: "When does my ad go live?",
                a: "Instantly after payment. Your ad starts flying over the city right away and you get a tracking link.",
              },
            ].map((item) => (
              <div
                key={item.q}
                className="border-[3px] border-border p-5"
              >
                <h3 className="text-[11px] text-cream">{item.q}</h3>
                <p className="mt-2 text-[10px] leading-relaxed text-muted normal-case">
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <div className="mt-14 text-center">
          <Link
            href="/"
            className="btn-press inline-block px-7 py-3.5 text-sm text-bg"
            style={{
              backgroundColor: ACCENT,
              boxShadow: `4px 4px 0 0 ${SHADOW}`,
            }}
          >
            Enter the City
          </Link>

          <p className="mt-4 text-[9px] text-muted normal-case">
            Questions? Email{" "}
            <a
              href="mailto:samuelrizzondev@gmail.com"
              className="transition-colors hover:text-cream"
              style={{ color: ACCENT }}
            >
              samuelrizzondev@gmail.com
            </a>
          </p>

          <p className="mt-6 text-[9px] text-muted normal-case">
            built by{" "}
            <a
              href="https://x.com/samuelrizzondev"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-cream"
              style={{ color: ACCENT }}
            >
              @samuelrizzondev
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
