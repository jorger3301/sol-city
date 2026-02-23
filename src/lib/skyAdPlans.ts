export type AdCurrency = "usd" | "brl";

export const SKY_AD_PLANS = {
  plane_weekly: {
    usd_cents: 1000,
    brl_cents: 4900,
    label: "Plane - Weekly",
    duration_days: 7,
    vehicle: "plane" as const,
  },
  plane_monthly: {
    usd_cents: 2900,
    brl_cents: 14900,
    label: "Plane - Monthly",
    duration_days: 30,
    vehicle: "plane" as const,
  },
  blimp_weekly: {
    usd_cents: 2000,
    brl_cents: 9900,
    label: "Blimp - Weekly",
    duration_days: 7,
    vehicle: "blimp" as const,
  },
  blimp_monthly: {
    usd_cents: 5900,
    brl_cents: 29900,
    label: "Blimp - Monthly",
    duration_days: 30,
    vehicle: "blimp" as const,
  },
} as const;

export type SkyAdPlanId = keyof typeof SKY_AD_PLANS;

export function isValidPlanId(id: string): id is SkyAdPlanId {
  return id in SKY_AD_PLANS;
}

export function getPriceCents(planId: SkyAdPlanId, currency: AdCurrency): number {
  const plan = SKY_AD_PLANS[planId];
  return currency === "brl" ? plan.brl_cents : plan.usd_cents;
}

export function formatPrice(cents: number, currency: AdCurrency): string {
  if (currency === "brl") return `R$${(cents / 100).toFixed(0)}`;
  return `$${(cents / 100).toFixed(0)}`;
}
