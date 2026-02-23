"use client";

import { useState, useEffect } from "react";
import { SKY_AD_PLANS, getPriceCents, formatPrice, type SkyAdPlanId, type AdCurrency } from "@/lib/skyAdPlans";
import { MAX_TEXT_LENGTH } from "@/lib/skyAds";

const ACCENT = "#c8e64a";

const PLAN_ORDER: SkyAdPlanId[] = [
  "plane_weekly",
  "plane_monthly",
  "blimp_weekly",
  "blimp_monthly",
];

function detectCurrency(): AdCurrency {
  if (typeof navigator === "undefined") return "usd";
  const lang = navigator.language || "";
  return lang.startsWith("pt") ? "brl" : "usd";
}

export function AdPurchaseForm() {
  const [currency, setCurrency] = useState<AdCurrency>("usd");
  const [selectedPlan, setSelectedPlan] = useState<SkyAdPlanId>("plane_weekly");
  const [text, setText] = useState("");
  const [brand, setBrand] = useState("");
  const [link, setLink] = useState("");
  const [color, setColor] = useState("#f8d880");
  const [bgColor, setBgColor] = useState("#1a1018");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setCurrency(detectCurrency());
  }, []);

  const textLength = text.length;
  const textOver = textLength > MAX_TEXT_LENGTH;

  const linkValid =
    !link || link.startsWith("https://") || link.startsWith("mailto:");
  const hexValid = (v: string) => /^#[0-9a-fA-F]{6}$/.test(v);
  const colorValid = hexValid(color);
  const bgColorValid = hexValid(bgColor);

  const canSubmit =
    text.trim().length > 0 &&
    !textOver &&
    colorValid &&
    bgColorValid &&
    linkValid &&
    !loading;

  async function handleSubmit() {
    if (!canSubmit) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/sky-ads/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_id: selectedPlan,
          text: text.trim(),
          color,
          bgColor,
          link: link || undefined,
          brand: brand || undefined,
          currency,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  const priceCents = getPriceCents(selectedPlan, currency);
  const priceLabel = formatPrice(priceCents, currency);

  return (
    <div>
      {/* Currency toggle */}
      <div className="mb-4 flex justify-end">
        <div className="flex items-center gap-1 border-[2px] border-border text-[9px]">
          <button
            type="button"
            onClick={() => setCurrency("usd")}
            className="px-3 py-1.5 transition-colors"
            style={{
              backgroundColor: currency === "usd" ? ACCENT : "transparent",
              color: currency === "usd" ? "#1a1018" : "var(--color-muted)",
            }}
          >
            USD
          </button>
          <button
            type="button"
            onClick={() => setCurrency("brl")}
            className="px-3 py-1.5 transition-colors"
            style={{
              backgroundColor: currency === "brl" ? ACCENT : "transparent",
              color: currency === "brl" ? "#1a1018" : "var(--color-muted)",
            }}
          >
            BRL
          </button>
        </div>
      </div>

      {/* Plan Selector */}
      <div className="grid gap-3 sm:grid-cols-2">
        {PLAN_ORDER.map((planId) => {
          const p = SKY_AD_PLANS[planId];
          const isSelected = selectedPlan === planId;
          const vehicleType = p.vehicle;
          const price = getPriceCents(planId, currency);

          return (
            <button
              key={planId}
              type="button"
              onClick={() => setSelectedPlan(planId)}
              className="relative border-[3px] p-4 text-left transition-colors"
              style={{
                borderColor: isSelected ? ACCENT : "var(--color-border)",
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">
                  {vehicleType === "plane" ? "\u2708" : "\uD83D\uDEA8"}
                </span>
                <span className="text-xs text-cream">{p.label}</span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-lg text-cream">
                  <span style={{ color: ACCENT }}>{formatPrice(price, currency)}</span>
                </span>
                <span className="text-[9px] text-muted normal-case">
                  / {p.duration_days} days
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Form Fields */}
      <div className="mt-8 space-y-5">
        {/* Banner text */}
        <div>
          <label className="block text-[10px] text-muted normal-case">
            Banner text *
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={MAX_TEXT_LENGTH + 10}
            rows={2}
            placeholder="YOUR BRAND MESSAGE HERE"
            className="mt-1 w-full border-[3px] border-border bg-transparent px-3 py-2 font-pixel text-xs text-cream uppercase outline-none transition-colors focus:border-[#c8e64a]"
          />
          <div className="mt-1 flex justify-between text-[9px]">
            <span className="text-muted normal-case">
              All caps, short and punchy works best
            </span>
            <span style={{ color: textOver ? "#ff6b6b" : "var(--color-muted)" }}>
              {textLength}/{MAX_TEXT_LENGTH}
            </span>
          </div>
        </div>

        {/* Brand name */}
        <div>
          <label className="block text-[10px] text-muted normal-case">
            Brand name
          </label>
          <input
            type="text"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            maxLength={60}
            placeholder="Your Company"
            className="mt-1 w-full border-[3px] border-border bg-transparent px-3 py-2 font-pixel text-xs text-cream outline-none transition-colors focus:border-[#c8e64a]"
          />
        </div>

        {/* Link */}
        <div>
          <label className="block text-[10px] text-muted normal-case">
            Link (optional)
          </label>
          <input
            type="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://yoursite.com"
            className="mt-1 w-full border-[3px] border-border bg-transparent px-3 py-2 font-pixel text-xs text-cream outline-none transition-colors focus:border-[#c8e64a]"
          />
          {link && !linkValid && (
            <p className="mt-1 text-[9px] normal-case" style={{ color: "#ff6b6b" }}>
              Must start with https:// or mailto:
            </p>
          )}
        </div>

        {/* Colors */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] text-muted normal-case">
              Text color
            </label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-9 w-9 cursor-pointer border-[3px] border-border bg-transparent"
              />
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                maxLength={7}
                className="w-full border-[3px] border-border bg-transparent px-3 py-2 font-pixel text-xs text-cream outline-none transition-colors focus:border-[#c8e64a]"
              />
            </div>
            {!colorValid && (
              <p className="mt-1 text-[9px] normal-case" style={{ color: "#ff6b6b" }}>
                Use #RRGGBB format
              </p>
            )}
          </div>
          <div>
            <label className="block text-[10px] text-muted normal-case">
              Background color
            </label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="h-9 w-9 cursor-pointer border-[3px] border-border bg-transparent"
              />
              <input
                type="text"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                maxLength={7}
                className="w-full border-[3px] border-border bg-transparent px-3 py-2 font-pixel text-xs text-cream outline-none transition-colors focus:border-[#c8e64a]"
              />
            </div>
            {!bgColorValid && (
              <p className="mt-1 text-[9px] normal-case" style={{ color: "#ff6b6b" }}>
                Use #RRGGBB format
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Live Preview */}
      <div className="mt-8">
        <p className="text-[10px] text-muted normal-case">Live preview</p>
        <div
          className="mt-2 overflow-hidden border-[3px] border-border"
        >
          <div
            className="relative px-4 py-3 text-center tracking-widest"
            style={{
              backgroundColor: bgColorValid ? bgColor : "#1a1018",
              color: colorValid ? color : "#f8d880",
              fontFamily: "monospace",
              fontSize: "11px",
              letterSpacing: "0.15em",
              textShadow: `0 0 8px ${colorValid ? color : "#f8d880"}44`,
            }}
          >
            {/* LED dot effect */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage:
                  "radial-gradient(circle, transparent 40%, rgba(0,0,0,0.15) 41%)",
                backgroundSize: "3px 3px",
              }}
            />
            <span className="relative">
              {text || "YOUR BANNER TEXT HERE"}
            </span>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <p
          className="mt-4 text-center text-[10px] normal-case"
          style={{ color: "#ff6b6b" }}
        >
          {error}
        </p>
      )}

      {/* Submit */}
      <div className="mt-8 text-center">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="btn-press inline-block px-7 py-3.5 text-sm text-bg transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          style={{
            backgroundColor: ACCENT,
            boxShadow: "4px 4px 0 0 #5a7a00",
          }}
        >
          {loading ? "Redirecting..." : `Buy - ${priceLabel}`}
        </button>
        <p className="mt-3 text-[9px] text-muted normal-case">
          You&apos;ll be redirected to Stripe for secure payment. No account needed.
        </p>
      </div>
    </div>
  );
}
