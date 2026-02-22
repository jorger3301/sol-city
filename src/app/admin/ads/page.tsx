"use client";

import { useEffect, useState, useCallback } from "react";

interface AdStats {
  id: string;
  brand: string;
  vehicle: string;
  active: boolean;
  impressions: number;
  clicks: number;
  cta_clicks: number;
  ctr: string;
}

interface AdForm {
  id: string;
  brand: string;
  text: string;
  description: string;
  color: string;
  bg_color: string;
  link: string;
  vehicle: "plane" | "blimp";
  priority: number;
  starts_at: string;
  ends_at: string;
}

const EMPTY_FORM: AdForm = {
  id: "",
  brand: "",
  text: "",
  description: "",
  color: "#f8d880",
  bg_color: "#1a1018",
  link: "",
  vehicle: "plane",
  priority: 50,
  starts_at: "",
  ends_at: "",
};

export default function AdminAdsPage() {
  const [ads, setAds] = useState<AdStats[]>([]);
  const [period, setPeriod] = useState<"7d" | "30d" | "all">("30d");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AdForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sky-ads/analytics?period=${period}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
      setAds(data.ads ?? []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleToggle = async (id: string, active: boolean) => {
    await fetch("/api/sky-ads/manage", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, active: !active }),
    });
    fetchStats();
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`Deactivate ad "${id}"?`)) return;
    await fetch(`/api/sky-ads/manage?id=${id}`, { method: "DELETE" });
    fetchStats();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        starts_at: form.starts_at || null,
        ends_at: form.ends_at || null,
      };
      const res = await fetch("/api/sky-ads/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "Failed to create ad");
        return;
      }
      setForm(EMPTY_FORM);
      setShowForm(false);
      fetchStats();
    } finally {
      setSaving(false);
    }
  };

  const totals = ads.reduce(
    (acc, a) => ({
      impressions: acc.impressions + a.impressions,
      clicks: acc.clicks + a.clicks,
      cta_clicks: acc.cta_clicks + a.cta_clicks,
    }),
    { impressions: 0, clicks: 0, cta_clicks: 0 }
  );
  const totalCtr =
    totals.impressions > 0
      ? (((totals.clicks + totals.cta_clicks) / totals.impressions) * 100).toFixed(2) + "%"
      : "0%";

  return (
    <div className="min-h-screen bg-bg p-4 sm:p-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-lg text-cream">SKY ADS DASHBOARD</h1>
            <p className="text-[9px] text-muted">Analytics & management</p>
          </div>
          <div className="flex gap-2">
            <a
              href="/"
              className="border border-border px-3 py-1.5 text-[9px] text-muted transition-colors hover:text-cream"
            >
              BACK
            </a>
            <button
              onClick={() => setShowForm(!showForm)}
              className="border border-lime px-3 py-1.5 text-[9px] text-lime transition-colors hover:bg-lime/10 cursor-pointer"
            >
              {showForm ? "CANCEL" : "+ NEW AD"}
            </button>
          </div>
        </div>

        {/* Create form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="mb-6 border border-border bg-bg-raised p-4">
            <p className="mb-3 text-[10px] text-cream">CREATE NEW AD</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                required
                placeholder="ID (slug)"
                value={form.id}
                onChange={(e) => setForm({ ...form, id: e.target.value })}
                className="border border-border bg-bg px-3 py-2 text-[10px] text-cream outline-none focus:border-lime"
              />
              <input
                required
                placeholder="Brand name"
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
                className="border border-border bg-bg px-3 py-2 text-[10px] text-cream outline-none focus:border-lime"
              />
              <input
                required
                placeholder="Banner text (max 80 chars)"
                maxLength={80}
                value={form.text}
                onChange={(e) => setForm({ ...form, text: e.target.value })}
                className="border border-border bg-bg px-3 py-2 text-[10px] text-cream outline-none focus:border-lime sm:col-span-2"
              />
              <input
                placeholder="Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="border border-border bg-bg px-3 py-2 text-[10px] text-cream outline-none focus:border-lime sm:col-span-2"
              />
              <input
                placeholder="Link (https:// or mailto:)"
                value={form.link}
                onChange={(e) => setForm({ ...form, link: e.target.value })}
                className="border border-border bg-bg px-3 py-2 text-[10px] text-cream outline-none focus:border-lime sm:col-span-2"
              />
              <div className="flex gap-3">
                <label className="flex items-center gap-2 text-[9px] text-muted">
                  Color
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    className="h-6 w-8 cursor-pointer border border-border bg-bg"
                  />
                </label>
                <label className="flex items-center gap-2 text-[9px] text-muted">
                  BG
                  <input
                    type="color"
                    value={form.bg_color}
                    onChange={(e) => setForm({ ...form, bg_color: e.target.value })}
                    className="h-6 w-8 cursor-pointer border border-border bg-bg"
                  />
                </label>
              </div>
              <div className="flex gap-3">
                <select
                  value={form.vehicle}
                  onChange={(e) => setForm({ ...form, vehicle: e.target.value as "plane" | "blimp" })}
                  className="border border-border bg-bg px-3 py-2 text-[9px] text-cream outline-none focus:border-lime"
                >
                  <option value="plane">Plane</option>
                  <option value="blimp">Blimp</option>
                </select>
                <input
                  type="number"
                  placeholder="Priority"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 50 })}
                  className="w-20 border border-border bg-bg px-3 py-2 text-[9px] text-cream outline-none focus:border-lime"
                />
              </div>
              <input
                type="datetime-local"
                placeholder="Starts at"
                value={form.starts_at}
                onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                className="border border-border bg-bg px-3 py-2 text-[9px] text-cream outline-none focus:border-lime"
              />
              <input
                type="datetime-local"
                placeholder="Ends at"
                value={form.ends_at}
                onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
                className="border border-border bg-bg px-3 py-2 text-[9px] text-cream outline-none focus:border-lime"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="mt-4 border border-lime bg-lime/10 px-4 py-2 text-[10px] text-lime transition-colors hover:bg-lime/20 disabled:opacity-50 cursor-pointer"
            >
              {saving ? "CREATING..." : "CREATE AD"}
            </button>
          </form>
        )}

        {/* Summary cards */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="border border-border bg-bg-raised p-3">
            <p className="text-[9px] text-muted">IMPRESSIONS</p>
            <p className="text-lg text-cream">{totals.impressions.toLocaleString()}</p>
          </div>
          <div className="border border-border bg-bg-raised p-3">
            <p className="text-[9px] text-muted">3D CLICKS</p>
            <p className="text-lg text-cream">{totals.clicks.toLocaleString()}</p>
          </div>
          <div className="border border-border bg-bg-raised p-3">
            <p className="text-[9px] text-muted">CTA CLICKS</p>
            <p className="text-lg text-cream">{totals.cta_clicks.toLocaleString()}</p>
          </div>
          <div className="border border-border bg-bg-raised p-3">
            <p className="text-[9px] text-muted">CTR</p>
            <p className="text-lg text-lime">{totalCtr}</p>
          </div>
        </div>

        {/* Period filter */}
        <div className="mb-4 flex gap-2">
          {(["7d", "30d", "all"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`cursor-pointer border px-3 py-1 text-[9px] transition-colors ${
                period === p
                  ? "border-lime text-lime"
                  : "border-border text-muted hover:text-cream"
              }`}
            >
              {p === "all" ? "ALL TIME" : p.toUpperCase()}
            </button>
          ))}
          <button
            onClick={fetchStats}
            className="ml-auto cursor-pointer border border-border px-3 py-1 text-[9px] text-muted transition-colors hover:text-cream"
          >
            REFRESH
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 border border-red-800 bg-red-900/20 p-3 text-[10px] text-red-400">
            {error}
          </div>
        )}

        {/* Table */}
        {loading ? (
          <p className="text-[10px] text-muted">Loading...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border text-[9px] text-muted">
                  <th className="pb-2 pr-4">AD</th>
                  <th className="pb-2 pr-4">TYPE</th>
                  <th className="pb-2 pr-4">STATUS</th>
                  <th className="pb-2 pr-4 text-right">IMPRESSIONS</th>
                  <th className="pb-2 pr-4 text-right">3D CLICKS</th>
                  <th className="pb-2 pr-4 text-right">CTA CLICKS</th>
                  <th className="pb-2 pr-4 text-right">CTR</th>
                  <th className="pb-2 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {ads.map((ad) => (
                  <tr key={ad.id} className="border-b border-border/50 text-[10px]">
                    <td className="py-2 pr-4">
                      <p className="text-cream">{ad.brand}</p>
                      <p className="text-[8px] text-dim">{ad.id}</p>
                    </td>
                    <td className="py-2 pr-4 text-muted">
                      {ad.vehicle === "blimp" ? "\u25C6 Blimp" : "\u2708 Plane"}
                    </td>
                    <td className="py-2 pr-4">
                      <span
                        className={`inline-block px-2 py-0.5 text-[8px] ${
                          ad.active
                            ? "bg-lime/10 text-lime"
                            : "bg-red-900/20 text-red-400"
                        }`}
                      >
                        {ad.active ? "ACTIVE" : "OFF"}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-right text-cream">
                      {ad.impressions.toLocaleString()}
                    </td>
                    <td className="py-2 pr-4 text-right text-cream">
                      {ad.clicks.toLocaleString()}
                    </td>
                    <td className="py-2 pr-4 text-right text-cream">
                      {ad.cta_clicks.toLocaleString()}
                    </td>
                    <td className="py-2 pr-4 text-right text-lime">{ad.ctr}</td>
                    <td className="py-2 text-right">
                      <button
                        onClick={() => handleToggle(ad.id, ad.active)}
                        className="mr-2 cursor-pointer text-[8px] text-muted transition-colors hover:text-cream"
                      >
                        {ad.active ? "PAUSE" : "RESUME"}
                      </button>
                      <button
                        onClick={() => handleDelete(ad.id)}
                        className="cursor-pointer text-[8px] text-red-400 transition-colors hover:text-red-300"
                      >
                        DELETE
                      </button>
                    </td>
                  </tr>
                ))}
                {ads.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-[10px] text-muted">
                      No ads found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
