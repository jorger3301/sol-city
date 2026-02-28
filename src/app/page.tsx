"use client";

import { useState, useCallback, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useWalletAuth } from "@/lib/useWalletAuth";
import { truncateAddress } from "@/lib/api/utils";
import WalletHUD from "@/components/WalletHUD";
import {
  generateProtocolCityLayout,
  placeResidentHouses,
  type CityBuilding,
  type CityPlaza,
  type CityDecoration,
  type CityRiver,
  type CityBridge,
  type ResidentData,
} from "@/lib/city-layout";
import Image from "next/image";
import Link from "next/link";
import ActivityTicker, { type FeedEvent } from "@/components/ActivityTicker";
import ActivityPanel from "@/components/ActivityPanel";
import LofiRadio from "@/components/LofiRadio";
import { ITEM_NAMES, ITEM_EMOJIS } from "@/lib/zones";
import { useRaidSequence } from "@/lib/useRaidSequence";
import RaidPreviewModal from "@/components/RaidPreviewModal";
import RaidOverlay from "@/components/RaidOverlay";
import PillModal from "@/components/PillModal";
import FounderMessage from "@/components/FounderMessage";
import RabbitCompletion from "@/components/RabbitCompletion";
import { DEFAULT_SKY_ADS, buildAdLink, trackAdEvent, isBuildingAd } from "@/lib/skyAds";
import { track } from "@vercel/analytics";
import {
  identifyUser,
  trackSignInClicked,
  trackBuildingClicked,
  trackKudosSent,
  trackSearchUsed,
  trackSkyAdImpression,
  trackSkyAdClick,
  trackSkyAdCtaClick,
  trackReferralLinkLanded,
  trackShareClicked,
  trackSignInPromptShown,
  trackSignInPromptClicked,
  trackDisabledButtonClicked,
} from "@/lib/himetrica";

const CityCanvas = dynamic(() => import("@/components/CityCanvas"), {
  ssr: false,
});

const THEMES = [
  { name: "Midnight", accent: "#6090e0", shadow: "#203870" },
  { name: "Sunset",   accent: "#c8e64a", shadow: "#5a7a00" },
  { name: "Neon",     accent: "#e040c0", shadow: "#600860" },
  { name: "Emerald",  accent: "#f0c060", shadow: "#806020" },
];

// Achievement display data for profile card (client-side, mirrors DB)
const TIER_COLORS_MAP: Record<string, string> = {
  bronze: "#cd7f32", silver: "#c0c0c0", gold: "#ffd700", diamond: "#b9f2ff",
};
const TIER_EMOJI_MAP: Record<string, string> = {
  bronze: "\uD83D\uDFE4", silver: "\u26AA", gold: "\uD83D\uDFE1", diamond: "\uD83D\uDC8E",
};
const ACHIEVEMENT_TIERS_MAP: Record<string, string> = {
  god_mode: "diamond", legend: "diamond", famous: "diamond", mayor: "diamond",
  machine: "gold", popular: "gold", factory: "gold", influencer: "gold", philanthropist: "gold", icon: "gold", legendary: "gold",
  grinder: "silver", architect: "silver", patron: "silver", beloved: "silver", admired: "silver",
  first_push: "bronze", committed: "bronze", builder: "bronze", rising_star: "bronze",
  recruiter: "bronze", generous: "bronze", gifted: "bronze", appreciated: "bronze",
  on_fire: "bronze", generous_streak: "bronze",
  dedicated: "silver",
  obsessed: "gold",
  no_life: "diamond",
  white_rabbit: "diamond",
};
const ACHIEVEMENT_NAMES_MAP: Record<string, string> = {
  god_mode: "God Mode", legend: "Legend", famous: "Famous", mayor: "Mayor",
  machine: "Machine", popular: "Popular", factory: "Factory", influencer: "Influencer",
  grinder: "Grinder", architect: "Architect", builder: "Builder", rising_star: "Rising Star",
  recruiter: "Recruiter", committed: "Committed", first_push: "First Push",
  philanthropist: "Philanthropist", patron: "Patron", generous: "Generous",
  icon: "Icon", beloved: "Beloved", gifted: "Gifted",
  legendary: "Legendary", admired: "Admired", appreciated: "Appreciated",
  on_fire: "On Fire", dedicated: "Dedicated", obsessed: "Obsessed",
  no_life: "No Life", generous_streak: "Generous Streak",
  white_rabbit: "White Rabbit",
};

// Dev "class" — funny RPG-style title, deterministic per username
const DEV_CLASSES = [
  "Vibe Coder",
  "Stack Overflow Tourist",
  "Console.log Debugger",
  "Ctrl+C Ctrl+V Engineer",
  "Senior Googler",
  "Git Push --force Enjoyer",
  "Dark Mode Purist",
  "Rubber Duck Whisperer",
  "Merge Conflict Magnet",
  "README Skipper",
  "npm install Addict",
  "Localhost Champion",
  "Monday Deployer",
  "Production Debugger",
  "Legacy Code Archaeologist",
  "Off-By-One Specialist",
  "Commit Message Poet",
  "Tab Supremacist",
  "Docker Compose Therapist",
  "10x Dev (Self-Proclaimed)",
  "AI Prompt Jockey",
  "Semicolon Forgetter",
  "CSS Trial-and-Error Main",
  "Works On My Machine Dev",
  "TODO: Fix Later Dev",
  "Infinite Loop Survivor",
  "PR Approved (Didn't Read)",
  "LGTM Speed Runner",
  "404 Brain Not Found",
  "Sudo Make Me A Sandwich",
];
function getDevClass(login: string) {
  let h = 0;
  for (let i = 0; i < login.length; i++) h = ((h << 5) - h + login.charCodeAt(i)) | 0;
  return DEV_CLASSES[((h % DEV_CLASSES.length) + DEV_CLASSES.length) % DEV_CLASSES.length];
}

function fmtUsd(val: number): string {
  if (val >= 1e9) return "$" + (val / 1e9).toFixed(2) + "B";
  if (val >= 1e6) return "$" + (val / 1e6).toFixed(1) + "M";
  if (val >= 1e3) return "$" + (val / 1e3).toFixed(0) + "K";
  if (val > 0) return "$" + val.toLocaleString();
  return "—";
}

interface CityStats {
  total_developers: number;
  total_contributions: number;
}

// ─── Loading phases for search feedback ─────────────────────
const LOADING_PHASES = [
  { delay: 0,     text: "Fetching protocol data..." },
  { delay: 2000,  text: "Analyzing on-chain activity..." },
  { delay: 5000,  text: "Building the city block..." },
  { delay: 9000,  text: "Almost there..." },
  { delay: 13000, text: "Crunching the numbers. Hang tight..." },
];

// Errors that won't change if you retry the same username
const PERMANENT_ERROR_CODES = new Set(["not-found", "org", "no-activity"]);

const ERROR_MESSAGES: Record<string, { primary: (u: string) => string; secondary: string; hasRetry?: boolean; hasLink?: boolean }> = {
  "not-found": {
    primary: (u) => `"${u}" wasn't found`,
    secondary: "Check the spelling — protocol slugs are case-insensitive.",
  },
  "org": {
    primary: (u) => `"${u}" is not a protocol`,
    secondary: "Sol City only shows Solana DeFi protocols. Try searching for a protocol name like 'jupiter' or 'raydium'.",
  },
  "no-activity": {
    primary: (u) => `"${u}" has no on-chain activity yet`,
    secondary: "This protocol may not have enough TVL to appear in the city.",
  },
  "rate-limit": {
    primary: () => "Search limit reached",
    secondary: "You can look up 10 protocols per hour. Protocols already in the city are unlimited.",
  },
  "github-rate-limit": {
    primary: () => "Data source temporarily unavailable",
    secondary: "Too many requests. Try again in a few minutes.",
  },
  "network": {
    primary: () => "Couldn't reach the server",
    secondary: "Check your internet connection and try again.",
    hasRetry: true,
  },
  "generic": {
    primary: () => "Something went wrong",
    secondary: "An unexpected error occurred. Try again.",
    hasRetry: true,
  },
};

function SearchFeedback({
  feedback,
  accentColor,
  onDismiss,
  onRetry,
}: {
  feedback: { type: "loading" | "error"; code?: string; username?: string; raw?: string } | null;
  accentColor: string;
  onDismiss: () => void;
  onRetry: () => void;
}) {
  const [phaseIndex, setPhaseIndex] = useState(0);

  // Phased loading messages
  useEffect(() => {
    if (feedback?.type !== "loading") { setPhaseIndex(0); return; }
    const timers = LOADING_PHASES.map((phase, i) =>
      setTimeout(() => setPhaseIndex(i), phase.delay)
    );
    return () => timers.forEach(clearTimeout);
  }, [feedback?.type]);

  // Auto-dismiss errors after 8s (except persistent ones)
  useEffect(() => {
    if (feedback?.type !== "error") return;
    const code = feedback.code ?? "generic";
    if (code === "no-activity" || code === "network" || code === "generic") return;
    const timer = setTimeout(onDismiss, 8000);
    return () => clearTimeout(timer);
  }, [feedback, onDismiss]);

  if (!feedback) return null;

  // Loading state
  if (feedback.type === "loading") {
    return (
      <div className="flex items-center gap-2 py-1 animate-[fade-in_0.15s_ease-out]">
        <span className="blink-dot h-2 w-2 flex-shrink-0" style={{ backgroundColor: accentColor }} />
        <span className="text-[11px] text-muted normal-case">{LOADING_PHASES[phaseIndex].text}</span>
      </div>
    );
  }

  // Error state
  const code = feedback.code ?? "generic";
  const msg = ERROR_MESSAGES[code] ?? ERROR_MESSAGES.generic;
  const u = feedback.username ?? "";

  return (
    <div
      className="relative w-full max-w-md border-[3px] bg-bg-raised/90 px-4 py-3 backdrop-blur-sm animate-[fade-in_0.15s_ease-out]"
      style={{ borderColor: code === "rate-limit" ? accentColor + "66" : "rgba(248, 81, 73, 0.4)" }}
    >
      <button onClick={onDismiss} className="absolute top-2 right-2 text-[10px] text-muted transition-colors hover:text-cream">&#10005;</button>
      <p className="text-[11px] text-cream normal-case pr-4">{msg.primary(u)}</p>
      <p className="mt-1 text-[10px] text-muted normal-case">{msg.secondary}</p>
      {msg.hasLink && (
        <a
          href="https://github.com/settings/profile"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-[10px] normal-case transition-colors hover:text-cream"
          style={{ color: accentColor }}
        >
          Open Profile Settings &rarr;
        </a>
      )}
      {msg.hasRetry && (
        <button
          onClick={onRetry}
          className="btn-press mt-2 border-[2px] border-border px-3 py-1 text-[10px] text-cream transition-colors hover:border-border-light"
        >
          Retry
        </button>
      )}
    </div>
  );
}

const LEADERBOARD_CATEGORIES = [
  { label: "Contributors", key: "contributions" as const, tab: "contributors" },
  { label: "Stars", key: "total_stars" as const, tab: "stars" },
  { label: "Repos", key: "public_repos" as const, tab: "architects" },
] as const;

function MiniLeaderboard({ buildings, accent }: { buildings: CityBuilding[]; accent: string }) {
  const [catIndex, setCatIndex] = useState(0);

  // Auto-rotate every 10s
  useEffect(() => {
    const timer = setInterval(() => {
      setCatIndex((i) => (i + 1) % LEADERBOARD_CATEGORIES.length);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const cat = LEADERBOARD_CATEGORIES[catIndex];
  const sorted = buildings
    .slice()
    .sort((a, b) => (b[cat.key] as number) - (a[cat.key] as number))
    .slice(0, 5);

  return (
    <div className="hidden w-[200px] sm:block">
      <div className="mb-2 flex items-center justify-between">
        <button
          onClick={() => setCatIndex((i) => (i + 1) % LEADERBOARD_CATEGORIES.length)}
          className="text-[10px] text-muted transition-colors hover:text-cream normal-case"
          style={{ color: accent }}
        >
          {cat.label}
        </button>
        <a
          href={`/leaderboard?tab=${cat.tab}`}
          className="text-[9px] text-muted transition-colors hover:text-cream normal-case"
        >
          View all &rarr;
        </a>
      </div>
      <div className="border-[2px] border-border bg-bg-raised/80 backdrop-blur-sm">
        {sorted.map((b, i) => (
          <a
            key={b.login}
            href={`/${b.login}`}
            className="flex items-center justify-between px-3 py-1.5 transition-colors hover:bg-bg-card"
          >
            <span className="flex items-center gap-2 overflow-hidden">
              <span
                className="text-[10px]"
                style={{
                  color:
                    i === 0 ? "#ffd700"
                    : i === 1 ? "#c0c0c0"
                    : i === 2 ? "#cd7f32"
                    : accent,
                }}
              >
                #{i + 1}
              </span>
              <span className="truncate text-[10px] text-cream normal-case">
                {b.login}
              </span>
            </span>
            <span className="ml-2 flex-shrink-0 text-[10px] text-muted">
              {(b[cat.key] as number).toLocaleString()}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}

function HomeContent() {
  const searchParams = useSearchParams();
  const userParam = searchParams.get("user");
  const giftedParam = searchParams.get("gifted");

  const [username, setUsername] = useState("");
  const failedUsernamesRef = useRef<Map<string, string>>(new Map()); // username -> error code
  const [buildings, setBuildings] = useState<CityBuilding[]>([]);
  const [plazas, setPlazas] = useState<CityPlaza[]>([]);
  const [decorations, setDecorations] = useState<CityDecoration[]>([]);
  const [river, setRiver] = useState<CityRiver | null>(null);
  const [bridges, setBridges] = useState<CityBridge[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [feedback, setFeedback] = useState<{
    type: "loading" | "error";
    code?: "not-found" | "org" | "no-activity" | "rate-limit" | "github-rate-limit" | "network" | "generic";
    username?: string;
    raw?: string;
  } | null>(null);
  const [flyMode, setFlyMode] = useState(false);
  const [flyVehicle, setFlyVehicle] = useState<string>("airplane");
  const [introMode, setIntroMode] = useState(false);
  const [introPhase, setIntroPhase] = useState(-1); // -1 = not started, 0-3 = text phases, 4 = done
  const [exploreMode, setExploreMode] = useState(false);
  const [themeIndex, setThemeIndex] = useState(0);
  const [hud, setHud] = useState({ speed: 0, altitude: 0 });
  const [flyPaused, setFlyPaused] = useState(false);
  const [flyPauseSignal, setFlyPauseSignal] = useState(0);
  const [stats, setStats] = useState<CityStats>({ total_developers: 0, total_contributions: 0 });
  const [focusedBuilding, setFocusedBuilding] = useState<string | null>(null);
  const [shareData, setShareData] = useState<{
    login: string;
    contributions: number;
    rank: number | null;
    avatar_url: string | null;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const walletAuth = useWalletAuth();
  const [purchasedItem, setPurchasedItem] = useState<string | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<CityBuilding | null>(null);
  const [feedEvents, setFeedEvents] = useState<FeedEvent[]>([]);
  const [feedPanelOpen, setFeedPanelOpen] = useState(false);
  const [kudosSending, setKudosSending] = useState(false);
  const [kudosSent, setKudosSent] = useState(false);
  const [kudosError, setKudosError] = useState<string | null>(null);
  const [focusDist, setFocusDist] = useState(999);
  const visitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [compareBuilding, setCompareBuilding] = useState<CityBuilding | null>(null);
  const [comparePair, setComparePair] = useState<[CityBuilding, CityBuilding] | null>(null);
  const [compareSelfHint, setCompareSelfHint] = useState(false);
  const [giftModalOpen, setGiftModalOpen] = useState(false);
  const [giftItems, setGiftItems] = useState<{ id: string; price_usd_cents: number; owned: boolean }[] | null>(null);
  const [giftBuying, setGiftBuying] = useState<string | null>(null);
  const [compareCopied, setCompareCopied] = useState(false);
  const [compareLang, setCompareLang] = useState<"en" | "pt">("en");
  const [clickedAd, setClickedAd] = useState<import("@/lib/skyAds").SkyAd | null>(null);
  const [skyAds, setSkyAds] = useState<import("@/lib/skyAds").SkyAd[]>(DEFAULT_SKY_ADS);
  const [pillModalOpen, setPillModalOpen] = useState(false);
  const [founderMessageOpen, setFounderMessageOpen] = useState(false);
  const [rabbitCinematic, setRabbitCinematic] = useState(false);
  const [rabbitCinematicPhase, setRabbitCinematicPhase] = useState(-1);
  const [rabbitProgress, setRabbitProgress] = useState(0);
  const [rabbitSighting, setRabbitSighting] = useState<number | null>(null);
  const [rabbitCompletion, setRabbitCompletion] = useState(false);
  const [rabbitHintFlash, setRabbitHintFlash] = useState<string | null>(null);

  // Growth optimization (A1: sign-in prompt, A5: ad direct open)
  const buildingClickCountRef = useRef(0);
  const signInPromptShownRef = useRef(false);
  const [signInPromptVisible, setSignInPromptVisible] = useState(false);
  const [adToast, setAdToast] = useState<string | null>(null);

  // A8: Ghost preview for own building
  const ghostPreviewShownRef = useRef(false);
  const [ghostPreviewLogin, setGhostPreviewLogin] = useState<string | null>(null);

  // Raid system
  const [raidState, raidActions] = useRaidSequence();
  const prevRaidPhaseRef = useRef<string>("idle");
  const lastSuccessfulRaidRef = useRef<{ defenderLogin: string; attackerLogin: string; tagStyle: string } | null>(null);

  // Track successful raid data before state resets
  useEffect(() => {
    if (raidState.raidData?.success && raidState.defenderBuilding) {
      lastSuccessfulRaidRef.current = {
        defenderLogin: raidState.defenderBuilding.login,
        attackerLogin: raidState.raidData.attacker.login,
        tagStyle: raidState.raidData.tag_style,
      };
    }
  }, [raidState.raidData, raidState.defenderBuilding]);

  // Update building with raid tag when raid exits
  useEffect(() => {
    const prev = prevRaidPhaseRef.current;
    prevRaidPhaseRef.current = raidState.phase;

    if (raidState.phase === "idle" && prev !== "idle" && prev !== "preview" && lastSuccessfulRaidRef.current) {
      const { defenderLogin, attackerLogin, tagStyle } = lastSuccessfulRaidRef.current;
      lastSuccessfulRaidRef.current = null;
      setBuildings((prev) =>
        prev.map((b) =>
          b.login === defenderLogin
            ? {
                ...b,
                active_raid_tag: {
                  attacker_login: attackerLogin,
                  tag_style: tagStyle,
                  expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
                },
              }
            : b
        )
      );
    }
  }, [raidState.phase]);

  // Fetch ads from DB (fallback to DEFAULT_SKY_ADS on error)
  useEffect(() => {
    fetch("/api/sky-ads")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (Array.isArray(data) && data.length > 0) setSkyAds(data); })
      .catch(() => {});
  }, []);

  // Derived — second focused building for dual-focus camera
  const focusedBuildingB = comparePair ? comparePair[1].login : null;

  const [isMobile, setIsMobile] = useState(false);

  const theme = THEMES[themeIndex];
  const didInit = useRef(false);
  const savedFocusRef = useRef<string | null>(null);

  // Detect mobile/touch device
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640 || "ontouchstart" in window);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);



  // Wallet address is the user identity (replaces GitHub authLogin)
  const authLogin = walletAuth.address ?? "";

  // Save ?ref= to localStorage (7-day expiry)
  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      trackReferralLinkLanded(ref);
      try {
        localStorage.setItem("gc_ref", JSON.stringify({ login: ref, expires: Date.now() + 7 * 86400000 }));
      } catch { /* ignore */ }
    }
  }, [searchParams]);

  // Connect wallet handler (replaces GitHub OAuth)
  const handleConnectWallet = useCallback(async () => {
    trackSignInClicked("city");
    await walletAuth.connect();
  }, [walletAuth]);

  // Fetch activity feed on mount + poll every 60s
  useEffect(() => {
    let cancelled = false;
    const fetchFeed = async () => {
      try {
        const res = await fetch("/api/feed?limit=50&today=1");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setFeedEvents(data.events ?? []);
      } catch { /* ignore */ }
    };
    fetchFeed();
    const interval = setInterval(fetchFeed, 120000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  // Visit tracking: fire visit POST after 3s of profile card open
  useEffect(() => {
    if (selectedBuilding && walletAuth.isConnected && selectedBuilding.login.toLowerCase() !== authLogin) {
      visitTimerRef.current = setTimeout(async () => {
        try {
          const building = buildings.find(b => b.login === selectedBuilding.login);
          if (!building) return;
          await fetch("/api/interactions/visit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ building_login: selectedBuilding.login }),
          });
        } catch { /* ignore */ }
      }, 3000);
    }
    return () => {
      if (visitTimerRef.current) clearTimeout(visitTimerRef.current);
    };
  }, [selectedBuilding, walletAuth.isConnected, authLogin, buildings]);

  // Kudos handler
  const handleGiveKudos = useCallback(async () => {
    if (!selectedBuilding || kudosSending || kudosSent || !walletAuth.isConnected) return;
    if (selectedBuilding.login.toLowerCase() === authLogin) return;
    setKudosSending(true);
    setKudosError(null);
    try {
      const res = await fetch("/api/interactions/kudos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiver_login: selectedBuilding.login }),
      });
      if (res.ok) {
        trackKudosSent(selectedBuilding.login);
        setKudosSent(true);
        // Increment kudos_count locally
        const newCount = (selectedBuilding.kudos_count ?? 0) + 1;
        setSelectedBuilding({ ...selectedBuilding, kudos_count: newCount });
        setBuildings((prev) =>
          prev.map((b) =>
            b.login === selectedBuilding.login ? { ...b, kudos_count: newCount } : b
          )
        );
        setTimeout(() => setKudosSent(false), 3000);
      } else {
        const body = await res.json().catch(() => null);
        const msg = body?.error || "Could not send kudos";
        setKudosError(msg);
        setTimeout(() => setKudosError(null), 3000);
      }
    } catch { /* ignore */ }
    finally { setKudosSending(false); }
  }, [selectedBuilding, kudosSending, kudosSent, walletAuth.isConnected, authLogin]);

  // Gift: open modal with available items
  const handleOpenGift = useCallback(async () => {
    if (!selectedBuilding || !walletAuth.isConnected) return;
    setGiftModalOpen(true);
    setGiftItems(null);
    try {
      const res = await fetch("/api/items");
      if (!res.ok) return;
      const { items } = await res.json();
      const receiverOwned = new Set(selectedBuilding.owned_items ?? []);
      const NON_GIFTABLE = new Set(["flag", "custom_color"]);
      const available = (items as { id: string; price_usd_cents: number; category: string }[])
        .filter((i) => i.price_usd_cents > 0 && !NON_GIFTABLE.has(i.id))
        .map((i) => ({ ...i, owned: receiverOwned.has(i.id) }));
      setGiftItems(available);
    } catch { /* ignore */ }
  }, [selectedBuilding, walletAuth.isConnected]);

  // Gift: checkout for receiver
  const handleGiftCheckout = useCallback(async (itemId: string) => {
    if (!selectedBuilding || giftBuying) return;
    setGiftBuying(itemId);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_id: itemId,
          provider: "stripe",
          gifted_to_login: selectedBuilding.login,
        }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      }
    } catch { /* ignore */ }
    finally { setGiftBuying(null); }
  }, [selectedBuilding, giftBuying]);

  const lastDistRef = useRef(999);

  const endRabbitCinematic = useCallback(() => {
    setRabbitCinematic(false);
    setRabbitCinematicPhase(-1);
  }, []);

  // ESC: layered dismissal
  // During fly mode: only close overlays (profile card) — AirplaneFlight handles pause/exit
  // Outside fly mode: compare → share modal → profile card → focus → explore mode
  useEffect(() => {
    if (flyMode && !selectedBuilding) return;
    if (!flyMode && !exploreMode && !focusedBuilding && !shareData && !selectedBuilding && !giftModalOpen && !comparePair && !compareBuilding && !founderMessageOpen && !pillModalOpen && !rabbitCinematic && raidState.phase === "idle") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        // Founder modals take highest priority
        if (founderMessageOpen) { setFounderMessageOpen(false); return; }
        if (pillModalOpen) { setPillModalOpen(false); return; }
        // Rabbit cinematic
        if (rabbitCinematic) { endRabbitCinematic(); return; }
        // Raid takes priority
        if (raidState.phase !== "idle") {
          if (raidState.phase === "preview") {
            raidActions.exitRaid();
          } else if (raidState.phase === "flight" || raidState.phase === "attack") {
            raidActions.skipToShare();
          } else if (raidState.phase === "share") {
            raidActions.exitRaid();
          } else {
            raidActions.exitRaid();
          }
          return;
        }
        if (flyMode && selectedBuilding) {
          setSelectedBuilding(null);
          setFocusedBuilding(null);
        } else if (!flyMode) {
          // Compare states take priority after fly mode
          if (comparePair) {
            // Return to building A's profile card
            setSelectedBuilding(comparePair[0]);
            setFocusedBuilding(comparePair[0].login);
            setComparePair(null);
            setCompareBuilding(null);
          } else if (compareBuilding) {
            // Cancel pick, restore profile card of first building
            setSelectedBuilding(compareBuilding);
            setFocusedBuilding(compareBuilding.login);
            setCompareBuilding(null);
          } else if (giftModalOpen) { setGiftModalOpen(false); setGiftItems(null); }
          else if (shareData) { setShareData(null); setSelectedBuilding(null); setFocusedBuilding(null); }
          else if (selectedBuilding) { setSelectedBuilding(null); setFocusedBuilding(null); }
          else if (focusedBuilding) setFocusedBuilding(null);
          else if (exploreMode) { setExploreMode(false); setFocusedBuilding(savedFocusRef.current); savedFocusRef.current = null; }
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flyMode, exploreMode, focusedBuilding, shareData, selectedBuilding, giftModalOpen, comparePair, compareBuilding, founderMessageOpen, pillModalOpen, rabbitCinematic, endRabbitCinematic, raidState.phase, raidActions]);

  // Rabbit cinematic text phase timing (8s total flyover)
  useEffect(() => {
    if (!rabbitCinematic) {
      setRabbitCinematicPhase(-1);
      return;
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    // Phase 0: "Follow the white rabbit..." at 0.5s
    timers.push(setTimeout(() => setRabbitCinematicPhase(0), 500));
    // Phase 1: "It hides among the plazas..." at 4.0s
    timers.push(setTimeout(() => setRabbitCinematicPhase(1), 4000));
    return () => timers.forEach(clearTimeout);
  }, [rabbitCinematic]);

  // Fetch rabbit progress on login
  useEffect(() => {
    if (!walletAuth.isConnected) return;
    fetch("/api/rabbit?check=true")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) return;
        setRabbitProgress(data.progress ?? 0);
        if (data.progress > 0 && data.progress < 5) {
          setRabbitSighting(data.progress + 1);
        }
      })
      .catch(() => {});
  }, [walletAuth.isConnected]);

  // Auto-dismiss rabbit hint flash
  useEffect(() => {
    if (!rabbitHintFlash) return;
    const t = setTimeout(() => setRabbitHintFlash(null), 3000);
    return () => clearTimeout(t);
  }, [rabbitHintFlash]);

  // Handle rabbit caught
  const onRabbitCaught = useCallback(async () => {
    if (!rabbitSighting) return;
    const sighting = rabbitSighting;
    setRabbitSighting(null);

    try {
      const res = await fetch("/api/rabbit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sighting }),
      });
      const data = await res.json();
      if (!res.ok) return;

      setRabbitProgress(data.progress);

      if (data.completed) {
        // Sighting 5: trigger cinematic
        setRabbitCompletion(true);
      } else {
        // Sightings 1-4: show hint + spawn next
        setRabbitHintFlash("The rabbit moves deeper...");
        setTimeout(() => {
          setRabbitSighting(data.progress + 1);
        }, 2000);
      }
    } catch {
      // Silently fail, rabbit will reappear on reload
    }
  }, [rabbitSighting]);

  const reloadCity = useCallback(async (bustCache = false) => {
    const cacheBust = bustCache ? `&_t=${Date.now()}` : "";
    const cacheBustQ = bustCache ? `?_t=${Date.now()}` : "";
    const CHUNK = 1000;

    // Fetch protocols and residents in parallel
    const [res, residentsRes] = await Promise.all([
      fetch(`/api/city?from=0&to=${CHUNK}${cacheBust}`),
      fetch(`/api/residents${cacheBustQ}`),
    ]);
    if (!res.ok) return null;
    const data = await res.json();
    setStats(data.stats);
    const protocols = data.protocols ?? data.developers ?? [];
    if (protocols.length === 0) return null;

    const residentsData = residentsRes.ok ? await residentsRes.json() : { residents: [] };
    const residents: ResidentData[] = residentsData.residents ?? [];

    // Render downtown immediately + resident houses
    const layout = generateProtocolCityLayout(protocols);
    const houses = placeResidentHouses(layout.buildings, residents);
    setBuildings([...layout.buildings, ...houses]);
    setPlazas(layout.plazas);
    setDecorations(layout.decorations);
    setRiver(layout.river);
    setBridges(layout.bridges);

    const total = data.stats?.total_developers ?? 0;
    if (total <= CHUNK) return [...layout.buildings, ...houses];

    // Fetch remaining chunks in parallel
    const promises: Promise<Record<string, unknown> | null>[] = [];
    for (let from = CHUNK; from < total; from += CHUNK) {
      promises.push(
        fetch(`/api/city?from=${from}&to=${from + CHUNK}${cacheBust}`)
          .then(r => r.ok ? r.json() : null)
      );
    }
    const results = await Promise.all(promises);
    let allProtocols = [...protocols];
    for (const chunk of results) {
      const chunkProtocols = (chunk as Record<string, unknown[]>)?.protocols ?? (chunk as Record<string, unknown[]>)?.developers ?? [];
      if (chunkProtocols.length) {
        allProtocols = [...allProtocols, ...chunkProtocols];
      }
    }

    // Regenerate full layout with all protocols + resident houses
    const fullLayout = generateProtocolCityLayout(allProtocols);
    const allHouses = placeResidentHouses(fullLayout.buildings, residents);
    const allBuildings = [...fullLayout.buildings, ...allHouses];
    setBuildings(allBuildings);
    setPlazas(fullLayout.plazas);
    setDecorations(fullLayout.decorations);
    setRiver(fullLayout.river);
    setBridges(fullLayout.bridges);
    return allBuildings;
  }, []);

  // Load city from Supabase on mount
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    async function loadCity() {
      try {
        await reloadCity();
      } catch {
        // City might be empty, that's ok
      } finally {
        setInitialLoading(false);
        // Start intro if first visit (no deep-link params)
        const hasDeepLink = searchParams.get("user") || searchParams.get("compare");
        if (!localStorage.getItem("solcity_intro_seen") && !hasDeepLink) {
          setIntroMode(true);
        }
      }
    }

    loadCity();
  }, [reloadCity]);

  // Reload city when user becomes a resident so their house appears
  const wasResidentRef = useRef(walletAuth.isResident);
  useEffect(() => {
    if (walletAuth.isResident && !wasResidentRef.current) {
      reloadCity(true);
    }
    wasResidentRef.current = walletAuth.isResident;
  }, [walletAuth.isResident, reloadCity]);

  // ─── Intro text phase timing (14s total) ─────────────────────
  // Phase 0: "Somewhere on the blockchain..."  0.8s → fade out ~3.8s
  // Phase 1: "Protocols became buildings"      4.2s → fade out ~7.2s
  // Phase 2: "And TVL became floors"           7.6s → fade out ~10.6s
  // Phase 3: "Welcome to Sol City"            11.0s → confetti + hold until end
  const INTRO_TEXT_SCHEDULE = [800, 4200, 7600, 11000];
  const [introConfetti, setIntroConfetti] = useState(false);

  useEffect(() => {
    if (!introMode) {
      setIntroPhase(-1);
      setIntroConfetti(false);
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < INTRO_TEXT_SCHEDULE.length; i++) {
      timers.push(setTimeout(() => setIntroPhase(i), INTRO_TEXT_SCHEDULE[i]));
    }
    // Confetti shortly after "Welcome to Sol City"
    timers.push(setTimeout(() => setIntroConfetti(true), INTRO_TEXT_SCHEDULE[3] + 500));

    return () => timers.forEach(clearTimeout);
  }, [introMode]);

  const endIntro = useCallback(() => {
    setIntroMode(false);
    setIntroPhase(-1);
    setIntroConfetti(false);
    localStorage.setItem("solcity_intro_seen", "true");
  }, []);

  const replayIntro = useCallback(() => {
    setIntroMode(true);
    setIntroPhase(-1);
    setIntroConfetti(false);
  }, []);

  // Focus on building from ?user= query param (skip if gift redirect, handled separately)
  const didFocusUserParam = useRef(false);
  useEffect(() => {
    if (!userParam || giftedParam || buildings.length === 0) return;

    const found = buildings.find(
      (b) => b.login.toLowerCase() === userParam.toLowerCase()
    );
    if (!found) return; // Not loaded yet, wait for next chunk

    if (!didFocusUserParam.current) {
      // First focus: enter explore mode
      didFocusUserParam.current = true;
      setFocusedBuilding(userParam);
      setSelectedBuilding(found);
      setExploreMode(true);
    } else {
      // Buildings array was replaced (full layout loaded) — keep selectedBuilding in sync
      setSelectedBuilding(prev =>
        prev && prev.login.toLowerCase() === userParam.toLowerCase() ? found : prev
      );
    }
  }, [userParam, giftedParam, buildings]);

  // Handle ?compare=userA,userB deep link
  const compareParam = searchParams.get("compare");
  const didHandleCompareParam = useRef(false);
  useEffect(() => {
    if (!compareParam || buildings.length === 0 || didHandleCompareParam.current) return;
    const parts = compareParam.split(",").map(s => s.trim().toLowerCase());
    if (parts.length !== 2 || parts[0] === parts[1]) return;

    const bA = buildings.find(b => b.login.toLowerCase() === parts[0]);
    const bB = buildings.find(b => b.login.toLowerCase() === parts[1]);

    if (bA && bB) {
      didHandleCompareParam.current = true;
      setComparePair([bA, bB]);
      setFocusedBuilding(bA.login);
      setExploreMode(true);
      return;
    }

    // One or both devs not loaded yet — fetch them, reload city, then compare
    didHandleCompareParam.current = true;
    (async () => {
      const missing = [!bA ? parts[0] : null, !bB ? parts[1] : null].filter(Boolean);
      await Promise.all(
        missing.map(login => fetch(`/api/dev/${encodeURIComponent(login!)}`))
      );
      const updated = await reloadCity(true);
      if (!updated) return;
      const foundA = updated.find((b: CityBuilding) => b.login.toLowerCase() === parts[0]);
      const foundB = updated.find((b: CityBuilding) => b.login.toLowerCase() === parts[1]);
      if (foundA && foundB) {
        setComparePair([foundA, foundB]);
        setFocusedBuilding(foundA.login);
        setExploreMode(true);
      }
    })();
  }, [compareParam, buildings, reloadCity]);

  // Detect post-purchase redirect (?purchased=item_id)
  const purchasedParam = searchParams.get("purchased");
  useEffect(() => {
    if (purchasedParam) {
      setPurchasedItem(purchasedParam);
      // Reload city to reflect new purchase
      reloadCity();
      // Clear purchased param from URL after a delay
      const timer = setTimeout(() => setPurchasedItem(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [purchasedParam, reloadCity]);

  // Detect post-gift redirect (?gifted=item_id&user=login)
  const [giftedInfo, setGiftedInfo] = useState<{ item: string; to: string } | null>(null);
  const didHandleGiftParam = useRef(false);
  useEffect(() => {
    if (giftedParam && userParam && buildings.length > 0 && !didHandleGiftParam.current) {
      didHandleGiftParam.current = true;
      setGiftedInfo({ item: giftedParam, to: userParam });
      reloadCity();
      // Focus on receiver's building
      setFocusedBuilding(userParam);
      const found = buildings.find(
        (b) => b.login.toLowerCase() === userParam.toLowerCase()
      );
      if (found) {
        setSelectedBuilding(found);
        setExploreMode(true);
      }
      const timer = setTimeout(() => setGiftedInfo(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [giftedParam, userParam, buildings, reloadCity]);

  const searchUser = useCallback(async () => {
    const trimmed = username.trim().toLowerCase();
    if (!trimmed) return;

    trackSearchUsed(trimmed);

    // Check if this username already failed with a permanent error
    const cachedError = failedUsernamesRef.current.get(trimmed);
    if (cachedError) {
      setFeedback({ type: "error", code: cachedError as any, username: trimmed });
      return;
    }

    // Snapshot compare state before async work — ESC may clear it mid-flight
    const wasComparing = compareBuilding;

    setLoading(true);
    setFeedback({ type: "loading" });
    setFocusedBuilding(null);
    setSelectedBuilding(null);
    setShareData(null);

    try {
      // Self-compare guard
      if (wasComparing && trimmed === wasComparing.login.toLowerCase()) {
        setCompareSelfHint(true);
        setTimeout(() => setCompareSelfHint(false), 2000);
        setFeedback(null);
        return;
      }

      // Check if dev already exists in the city before the fetch
      const existedBefore = buildings.some(
        (b) => b.login.toLowerCase() === trimmed
      );

      // Add/refresh the developer
      const devRes = await fetch(`/api/dev/${encodeURIComponent(trimmed)}`);
      const devData = await devRes.json();

      if (!devRes.ok) {
        let code: "not-found" | "org" | "no-activity" | "rate-limit" | "github-rate-limit" | "generic" = "generic";
        if (devRes.status === 404) code = "not-found";
        else if (devRes.status === 429) {
          code = devData.error?.includes("GitHub") ? "github-rate-limit" : "rate-limit";
        } else if (devRes.status === 400) {
          if (devData.error?.includes("Organization")) code = "org";
          else if (devData.error?.includes("no public activity")) code = "no-activity";
        }
        // Cache permanent errors so we don't re-fetch
        if (PERMANENT_ERROR_CODES.has(code)) {
          failedUsernamesRef.current.set(trimmed, code);
        }
        setFeedback({ type: "error", code, username: trimmed, raw: devData.error });
        return;
      }

      setFeedback(null);

      // Reload city with cache-bust so the new dev is included
      const updatedBuildings = await reloadCity(true);

      // Focus camera on the searched building
      setFocusedBuilding(devData.github_login);

      // A8: Ghost preview — if user searched for themselves, show temporary effect
      if (
        authLogin &&
        trimmed === authLogin &&
        !ghostPreviewShownRef.current
      ) {
        ghostPreviewShownRef.current = true;
        setGhostPreviewLogin(devData.github_login);
        setTimeout(() => setGhostPreviewLogin(null), 4000);
      }

      // Find the building in the updated city
      const foundBuilding = updatedBuildings?.find(
        (b: CityBuilding) => b.login.toLowerCase() === trimmed
      );

      // Compare pick mode: use snapshot so ESC mid-search doesn't cause stale state
      if (wasComparing && !comparePair && foundBuilding) {
        // Only complete if compare mode is still active (not cancelled by ESC)
        if (compareBuilding) {
          setComparePair([wasComparing, foundBuilding]);
          setFocusedBuilding(wasComparing.login);
        } else {
          // Compare was cancelled during search — fall through to normal
          if (foundBuilding) {
            setSelectedBuilding(foundBuilding);
            setExploreMode(true);
          }
        }
      } else if (!existedBefore) {
        // New developer: show the share modal
        setShareData({
          login: devData.github_login,
          contributions: devData.contributions,
          rank: devData.rank,
          avatar_url: devData.avatar_url,
        });
        if (foundBuilding) setSelectedBuilding(foundBuilding);
        setCopied(false);
      } else if (foundBuilding) {
        // Existing developer: enter explore mode and show profile card
        setSelectedBuilding(foundBuilding);
        setExploreMode(true);
      }
      setUsername("");
    } catch {
      setFeedback({ type: "error", code: "network", username: trimmed });
    } finally {
      setLoading(false);
    }
  }, [username, buildings, reloadCity]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    searchUser();
  };

  const handleSignIn = handleConnectWallet;
  const handleSignOut = walletAuth.disconnect;

  // Shop link
  const shopHref = "/shop";

  return (
    <main className="relative min-h-screen overflow-hidden bg-bg font-pixel uppercase text-warm">
      {/* 3D Canvas */}
      <CityCanvas
        buildings={buildings}
        plazas={plazas}
        decorations={decorations}
        river={river}
        bridges={bridges}
        flyMode={flyMode}
        flyVehicle={flyVehicle}
        onExitFly={() => { setFlyMode(false); setFlyPaused(false); }}
        themeIndex={themeIndex}
        onHud={(s, a) => setHud({ speed: s, altitude: a })}
        onPause={(p) => setFlyPaused(p)}
        focusedBuilding={focusedBuilding}
        focusedBuildingB={focusedBuildingB}
        accentColor={theme.accent}
        onClearFocus={() => setFocusedBuilding(null)}
        flyPauseSignal={flyPauseSignal}
        flyHasOverlay={!!selectedBuilding}
        skyAds={skyAds}
        onAdClick={(ad) => {
          trackAdEvent(ad.id, "click", authLogin || undefined);
          trackSkyAdClick(ad.id, ad.vehicle, ad.link);
          // Building ads (billboard, rooftop, led_wrap): direct open
          // Sky ads (plane, blimp): show modal first so user sees what it is
          if (ad.link && isBuildingAd(ad.vehicle)) {
            const ctaHref = buildAdLink(ad) ?? ad.link;
            const isMailto = ad.link.startsWith("mailto:");
            trackAdEvent(ad.id, "cta_click", authLogin || undefined);
            trackSkyAdCtaClick(ad.id, ad.vehicle);
            track("sky_ad_click", { ad_id: ad.id, vehicle: ad.vehicle, brand: ad.brand ?? "" });
            if (isMailto) {
              window.location.href = ctaHref;
            } else {
              const a = document.createElement("a");
              a.href = ctaHref;
              a.target = "_blank";
              a.rel = "noopener noreferrer";
              a.click();
            }
            try { setAdToast(ad.brand || new URL(ad.link).hostname.replace("www.", "")); } catch { setAdToast(ad.brand || "link"); }
            setTimeout(() => setAdToast(null), 2500);
          } else {
            setClickedAd(ad);
          }
        }}
        onAdViewed={(adId) => {
          trackAdEvent(adId, "impression", authLogin || undefined);
          const ad = skyAds.find(a => a.id === adId);
          if (ad) trackSkyAdImpression(ad.id, ad.vehicle, ad.brand);
        }}
        introMode={introMode}
        onIntroEnd={endIntro}
        onFocusInfo={() => {}}
        ghostPreviewLogin={ghostPreviewLogin}
        raidPhase={raidState.phase}
        raidData={raidState.raidData}
        raidAttacker={raidState.attackerBuilding}
        raidDefender={raidState.defenderBuilding}
        onRaidPhaseComplete={raidActions.onPhaseComplete}
        onLandmarkClick={() => { setPillModalOpen(true); setSelectedBuilding(null); }}
        rabbitSighting={rabbitSighting}
        onRabbitCaught={onRabbitCaught}
        rabbitCinematic={rabbitCinematic}
        onRabbitCinematicEnd={endRabbitCinematic}
        rabbitCinematicTarget={rabbitSighting ?? undefined}
        onBuildingClick={(b) => {
          trackBuildingClicked(b.login);
          // A1: Wallet connect prompt after 3 building clicks without wallet
          if (!walletAuth.isConnected && !signInPromptShownRef.current) {
            buildingClickCountRef.current += 1;
            if (buildingClickCountRef.current >= 3) {
              signInPromptShownRef.current = true;
              setSignInPromptVisible(true);
              trackSignInPromptShown();
              setTimeout(() => setSignInPromptVisible(false), 8000);
            }
          }
          // Compare pick mode: clicking a second building completes the pair
          if (compareBuilding && !comparePair) {
            if (b.login.toLowerCase() === compareBuilding.login.toLowerCase()) {
              setCompareSelfHint(true);
              setTimeout(() => setCompareSelfHint(false), 2000);
              return;
            }
            setComparePair([compareBuilding, b]);
            setFocusedBuilding(compareBuilding.login);
            return;
          }
          // Active comparison: ignore clicks
          if (comparePair) return;

          setSelectedBuilding(b);
          setFocusedBuilding(b.login);
          setKudosSent(false);
          setKudosError(null);
          lastDistRef.current = 999;
          setFocusDist(999);
          if (flyMode) {
            // Auto-pause flight to show profile card
            setFlyPauseSignal(s => s + 1);
          } else if (!exploreMode) {
            setExploreMode(true);
          }
        }}
      />

      {/* ─── Intro Flyover Overlay ─── */}
      {introMode && (
        <div className="pointer-events-none fixed inset-0 z-50">
          {/* Cinematic letterbox bars (transform: scaleY for composited-only GPU animation) */}
          <div
            className="absolute inset-x-0 top-0 origin-top bg-black/80 transition-transform duration-1000"
            style={{ height: "12%", transform: introPhase >= 0 ? "scaleY(1)" : "scaleY(0)" }}
          />
          <div
            className="absolute inset-x-0 bottom-0 origin-bottom bg-black/80 transition-transform duration-1000"
            style={{ height: "18%", transform: introPhase >= 0 ? "scaleY(1)" : "scaleY(0)" }}
          />

          {/* Text in the lower bar area */}
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center" style={{ height: "18%" }}>
            {/* Narrative texts (phases 0-2) */}
            {[
              "Somewhere on the blockchain...",
              "Protocols became buildings",
              "And TVL became floors",
            ].map((text, i) => (
              <p
                key={i}
                className="absolute text-center font-pixel normal-case text-cream"
                style={{
                  fontSize: "clamp(0.85rem, 3vw, 1.5rem)",
                  letterSpacing: "0.05em",
                  opacity: introPhase === i ? 1 : 0,
                  transition: "opacity 0.7s ease-in-out",
                }}
              >
                {text}
              </p>
            ))}

            {/* Welcome to Sol City (phase 3) */}
            <div
              className="absolute flex flex-col items-center gap-1"
              style={{
                opacity: introPhase === 3 ? 1 : 0,
                transform: introPhase === 3 ? "scale(1)" : "scale(0.95)",
                transition: "opacity 0.8s ease-out, transform 0.8s ease-out",
              }}
            >
              <p
                className="text-center font-pixel uppercase text-cream"
                style={{ fontSize: "clamp(1.2rem, 5vw, 2.8rem)" }}
              >
                Welcome to{" "}
                <span style={{ color: theme.accent }}>Sol City</span>
              </p>
            </div>
          </div>

          {/* Confetti burst */}
          {introConfetti && (
            <div className="absolute inset-0 overflow-hidden">
              {Array.from({ length: 25 }).map((_, i) => {
                const colors = [theme.accent, "#fff", theme.shadow, "#f0c060", "#e040c0", "#60c0f0"];
                const color = colors[i % colors.length];
                const left = 10 + Math.random() * 80;
                const delay = Math.random() * 0.6;
                const duration = 2.5 + Math.random() * 1.5;
                const w = 3 + Math.random() * 5;
                const h = Math.random() > 0.5 ? w : w * 0.35;
                const drift = (Math.random() - 0.5) * 80;
                const rotation = Math.random() * 720;
                return (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      left: `${left}%`,
                      top: "-8px",
                      width: `${w}px`,
                      height: `${h}px`,
                      backgroundColor: color,
                      animation: `introConfettiFall ${duration}s ${delay}s ease-in forwards`,
                      transform: `rotate(${rotation}deg) translateX(${drift}px)`,
                      opacity: 0,
                    }}
                  />
                );
              })}
            </div>
          )}

          {/* Skip button - top right, outside the cinematic bars */}
          <button
            className="pointer-events-auto absolute top-4 right-4 font-pixel text-[10px] uppercase text-cream/40 transition-colors hover:text-cream sm:text-xs"
            onClick={endIntro}
          >
            Skip &gt;
          </button>
        </div>
      )}

      {/* ─── Fly Mode HUD ─── */}
      {flyMode && (
        <div className="pointer-events-none fixed inset-0 z-30">
          {/* Top bar */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2">
            <div className="inline-flex items-center gap-3 border-[3px] border-border bg-bg/70 px-5 py-2.5 backdrop-blur-sm">
              <span
                className={`h-2 w-2 flex-shrink-0 ${flyPaused ? "" : "blink-dot"}`}
                style={{ backgroundColor: flyPaused ? "#f85149" : theme.accent }}
              />
              <span className="text-[10px] text-cream">
                {flyPaused ? "Paused" : "Fly"}
              </span>
            </div>
          </div>

          {/* Flight data */}
          <div className="absolute bottom-4 left-3 text-[9px] leading-loose text-muted sm:bottom-6 sm:left-6 sm:text-[10px]">
            <div className="flex items-center gap-2">
              <span>SPD</span>
              <span style={{ color: theme.accent }} className="w-6 text-right">
                {Math.round(hud.speed)}
              </span>
              <div className="flex h-[6px] w-20 items-center border border-border/60 bg-bg/50">
                <div
                  className="h-full transition-all duration-150"
                  style={{
                    width: `${Math.round(((hud.speed - 20) / 140) * 100)}%`,
                    backgroundColor: theme.accent,
                  }}
                />
              </div>
            </div>
            <div>
              ALT{" "}
              <span style={{ color: theme.accent }}>
                {Math.round(hud.altitude)}
              </span>
            </div>
          </div>

          {/* Controls hint */}
          <div className="absolute bottom-4 right-3 text-right text-[8px] leading-loose text-muted sm:bottom-6 sm:right-6 sm:text-[9px]">
            {flyPaused ? (
              <>
                <div>
                  <span className="text-cream">Drag</span> orbit
                </div>
                <div>
                  <span className="text-cream">Scroll</span> zoom
                </div>
                <div>
                  <span className="text-cream">WASD</span> resume
                </div>
                <div>
                  <span style={{ color: theme.accent }}>ESC</span> exit
                </div>
              </>
            ) : (
              <>
                <div>
                  <span className="text-cream">Mouse</span> steer
                </div>
                <div>
                  <span className="text-cream">Shift</span> boost
                </div>
                <div>
                  <span className="text-cream">Alt</span> slow
                </div>
                <div>
                  <span className="text-cream">Scroll</span> base speed
                </div>
                <div>
                  <span style={{ color: theme.accent }}>P</span> pause
                </div>
                <div>
                  <span style={{ color: theme.accent }}>ESC</span> pause
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ─── Explore Mode: minimal UI ─── */}
      {exploreMode && !flyMode && (
        <div className="pointer-events-none fixed inset-0 z-20">
          {/* Back button */}
          <div className="pointer-events-auto absolute top-3 left-3 sm:top-4 sm:left-4">
            <button
              onClick={() => {
                if (selectedBuilding) {
                  setSelectedBuilding(null);
                  setFocusedBuilding(null);
                } else {
                  setExploreMode(false);
                  setFocusedBuilding(savedFocusRef.current);
                  savedFocusRef.current = null;
                }
              }}
              className="flex items-center gap-2 border-[3px] border-border bg-bg/70 px-3 py-1.5 text-[10px] backdrop-blur-sm transition-colors"
              style={{ borderColor: undefined }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = theme.accent + "80")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "")}
            >
              <span style={{ color: theme.accent }}>ESC</span>
              <span className="text-cream">Back</span>
            </button>
          </div>

          {/* Theme switcher (bottom-left) — same position as main controls */}
          <div className="pointer-events-auto fixed bottom-10 left-3 z-[25] flex items-center gap-2 sm:left-4">
            <button
              onClick={() => setThemeIndex((i) => (i + 1) % THEMES.length)}
              className="btn-press flex items-center gap-1.5 border-[3px] border-border bg-bg/70 px-2.5 py-1 text-[10px] backdrop-blur-sm transition-colors hover:border-border-light"
            >
              <span style={{ color: theme.accent }}>&#9654;</span>
              <span className="text-cream">{theme.name}</span>
              <span className="text-dim">{themeIndex + 1}/{THEMES.length}</span>
            </button>
          </div>

          {/* Feed toggle (top-right, below badges on desktop) */}
          {feedEvents.length >= 1 && (
            <div className="pointer-events-auto absolute top-3 right-3 sm:top-14 sm:right-4">
              <button
                onClick={() => setFeedPanelOpen(true)}
                className="flex items-center gap-2 border-[3px] border-border bg-bg/70 px-3 py-1.5 text-[10px] backdrop-blur-sm transition-colors"
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = theme.accent + "80")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "")}
              >
                <span style={{ color: theme.accent }}>&#9679;</span>
                <span className="text-cream">Feed</span>
              </button>
            </div>
          )}

          {/* Navigation hints (bottom-right) — hidden when building card is open */}
          {!selectedBuilding && (
            <div className="absolute bottom-3 right-3 text-right text-[8px] leading-loose text-muted sm:bottom-4 sm:right-4 sm:text-[9px]">
              <div><span className="text-cream">Drag</span> orbit</div>
              <div><span className="text-cream">Scroll</span> zoom</div>
              <div><span className="text-cream">Right-drag</span> pan</div>
              <div><span className="text-cream">Click</span> building</div>
              <div><span style={{ color: theme.accent }}>ESC</span> back</div>
            </div>
          )}
        </div>
      )}

      {/* Shop & Auth moved to center buttons area */}

      {/* ─── Badges (mobile: top-center, desktop: top-right) ─── */}
      {!flyMode && !introMode && !rabbitCinematic && (
        <div className="pointer-events-auto fixed top-3 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 sm:left-auto sm:right-4 sm:top-4 sm:translate-x-0">
          <a
            href="https://github.com/jorger3301/sol-city"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 border-[3px] border-border bg-bg/70 px-2.5 py-1 text-[10px] backdrop-blur-sm transition-colors hover:border-border-light"
          >
            <span style={{ color: theme.accent }}>&#9733;</span>
            <span className="text-cream">Star</span>
          </a>
          <a
            href="https://github.com/sponsors/jorger3301"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 border-[3px] border-border bg-bg/70 px-2.5 py-1 text-[10px] backdrop-blur-sm transition-colors hover:border-border-light"
          >
            <span style={{ color: theme.accent }}>&#9829;</span>
            <span className="text-cream">Sponsor</span>
          </a>
        </div>
      )}

      {/* ─── Main UI Overlay ─── */}
      {!flyMode && !exploreMode && !introMode && !rabbitCinematic && (
        <div
          className="pointer-events-none fixed inset-0 z-20 flex flex-col items-center justify-between pt-12 pb-4 px-3 sm:py-8 sm:px-4"
          style={{
            background:
              "linear-gradient(to bottom, rgba(13,13,15,0.88) 0%, rgba(13,13,15,0.55) 30%, transparent 60%, transparent 85%, rgba(13,13,15,0.5) 100%)",
          }}
        >
          {/* Top */}
          <div className="pointer-events-auto flex w-full max-w-2xl flex-col items-center gap-3 sm:gap-5">
            <div className="text-center">
              <h1 className="text-2xl text-cream sm:text-3xl md:text-5xl">
                Sol{" "}
                <span style={{ color: theme.accent }}>City</span>
              </h1>
              <p className="mt-2 text-[10px] leading-relaxed text-cream/80 normal-case">
                {stats.total_developers > 0
                  ? `Solana Protocols as a 3D City. Explore DeFi.`
                  : "Solana Protocols as a 3D City. Explore DeFi."}
              </p>
            </div>

            {/* Search */}
            <form
              onSubmit={handleSubmit}
              className="flex w-full max-w-md items-center gap-2"
            >
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (feedback?.type === "error") setFeedback(null);
                }}
                placeholder="find a protocol or resident in the city"
                className="min-w-0 flex-1 border-[3px] border-border bg-bg-raised px-3 py-2 text-base sm:text-xs text-cream outline-none transition-colors placeholder:text-dim sm:px-4 sm:py-2.5"
                style={{ borderColor: undefined }}
                onFocus={(e) => (e.currentTarget.style.borderColor = theme.accent)}
                onBlur={(e) => (e.currentTarget.style.borderColor = "")}
              />
              <button
                type="submit"
                disabled={loading || !username.trim()}
                className="btn-press flex-shrink-0 px-4 py-2 text-xs text-bg disabled:opacity-40 sm:px-5 sm:py-2.5"
                style={{
                  backgroundColor: theme.accent,
                  boxShadow: `4px 4px 0 0 ${theme.shadow}`,
                }}
              >
                {loading ? <span className="blink-dot inline-block">_</span> : "Search"}
              </button>
            </form>

            {/* Search Feedback: loading phases + errors */}
            <SearchFeedback feedback={feedback} accentColor={theme.accent} onDismiss={() => setFeedback(null)} onRetry={searchUser} />

            {initialLoading && (
              <p className="text-[10px] text-muted normal-case">
                Loading city...
              </p>
            )}
          </div>

          {/* Center - Explore buttons + Shop + Auth */}
          {buildings.length > 0 && (
            <div className="pointer-events-auto flex flex-col items-center gap-3">
              {/* Primary actions */}
              <div className="flex items-center gap-3 sm:gap-4">
                <button
                  onClick={() => setExploreMode(true)}
                  className="btn-press px-7 py-3 text-xs sm:py-3.5 sm:text-sm text-bg"
                  style={{
                    backgroundColor: theme.accent,
                    boxShadow: `4px 4px 0 0 ${theme.shadow}`,
                  }}
                >
                  Explore City
                </button>
                {!isMobile && (
                  <button
                    onClick={() => { setFocusedBuilding(null); setFlyMode(true); }}
                    className="btn-press px-7 py-3 text-xs sm:py-3.5 sm:text-sm text-bg"
                    style={{
                      backgroundColor: theme.accent,
                      boxShadow: `4px 4px 0 0 ${theme.shadow}`,
                    }}
                  >
                    &#9992; Fly
                  </button>
                )}
              </div>

              {/* Nav links */}
              <div className="flex items-center justify-center gap-2">
                <Link
                  href={shopHref}
                  className="btn-press border-[3px] border-border bg-bg/80 px-4 py-1.5 text-[10px] backdrop-blur-sm transition-colors hover:border-border-light"
                  style={{ color: theme.accent }}
                >
                  Shop
                </Link>
                <Link
                  href="/advertise"
                  className="btn-press relative border-[3px] px-4 py-1.5 text-[10px] backdrop-blur-sm transition-colors"
                  style={{ color: theme.accent, borderColor: theme.accent + "60", backgroundColor: theme.accent + "12" }}
                >
                  Place your Ad
                  <span
                    className="absolute -top-1.5 -right-2 rounded-sm px-1 py-px text-[7px] font-bold leading-none text-bg"
                    style={{ backgroundColor: theme.accent }}
                  >
                    NEW
                  </span>
                </Link>
                <Link
                  href="/leaderboard"
                  className="btn-press border-[3px] border-border bg-bg/80 px-4 py-1.5 text-[10px] backdrop-blur-sm transition-colors hover:border-border-light"
                  style={{ color: theme.accent }}
                >
                  &#9819; Leaderboard
                </Link>
              </div>

              {/* Auth — Wallet Connect */}
              <div className="flex items-center justify-center gap-2">
                {!walletAuth.isConnected ? (
                  <button
                    onClick={handleSignIn}
                    disabled={walletAuth.connecting}
                    className="btn-press flex items-center gap-1.5 border-[3px] border-border bg-bg/80 px-3 py-1.5 text-[10px] backdrop-blur-sm transition-colors hover:border-border-light disabled:opacity-50"
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: theme.accent }}
                    />
                    <span className="text-cream">
                      {walletAuth.connecting ? "Connecting..." : "Connect Wallet"}
                    </span>
                  </button>
                ) : (
                  <>
                    <span className="flex items-center gap-1.5 border-[3px] border-border bg-bg/80 px-3 py-1.5 text-[10px] text-cream normal-case backdrop-blur-sm">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: "#14F195" }}
                      />
                      {truncateAddress(walletAuth.address!)}
                      {walletAuth.isResident && (
                        <span className="text-[8px]" style={{ color: "#14F195" }}>
                          Resident
                        </span>
                      )}
                    </span>
                    <button
                      onClick={handleSignOut}
                      className="border-[2px] border-border bg-bg/80 px-2 py-1 text-[9px] text-muted backdrop-blur-sm transition-colors hover:text-cream hover:border-border-light"
                    >
                      Disconnect
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Bottom — leaderboard only (info + theme moved to fixed elements) */}
          <div className="pointer-events-auto flex w-full items-end justify-end">
            {/* Mini Leaderboard - hidden on mobile, rotates categories */}
            {buildings.length > 0 && (
              <MiniLeaderboard buildings={buildings} accent={theme.accent} />
            )}
          </div>
        </div>
      )}

      {/* ─── Purchase Toast ─── */}
      {purchasedItem && (
        <div className="fixed top-16 left-1/2 z-50 -translate-x-1/2">
          <div
            className="border-[3px] px-5 py-2.5 text-[10px] text-bg"
            style={{
              backgroundColor: theme.accent,
              borderColor: theme.shadow,
            }}
          >
            Item purchased! Effect applied to your building.
          </div>
        </div>
      )}

      {/* ─── Gift Toast ─── */}
      {giftedInfo && (
        <div className="fixed top-16 left-1/2 z-50 -translate-x-1/2">
          <div
            className="flex items-center gap-2 border-[3px] px-5 py-2.5 text-[10px] text-bg"
            style={{
              backgroundColor: theme.accent,
              borderColor: theme.shadow,
            }}
          >
            <span className="text-base">🎁</span>
            <span>{ITEM_NAMES[giftedInfo.item] ?? giftedInfo.item} sent to {giftedInfo.to}!</span>
          </div>
        </div>
      )}

      {/* ─── A1: Wallet connect prompt after building exploration ─── */}
      {signInPromptVisible && !walletAuth.isConnected && (
        <div className="fixed top-20 left-1/2 z-50 -translate-x-1/2 w-[calc(100%-1.5rem)] max-w-xs animate-[slide-up_0.2s_ease-out]">
          <div className="border-[3px] border-border bg-bg-raised/95 px-4 py-3 backdrop-blur-sm">
            <p className="text-[10px] text-cream normal-case mb-2.5 leading-relaxed">
              Connect your wallet to explore your on-chain activity
            </p>
            <button
              onClick={() => {
                trackSignInPromptClicked();
                setSignInPromptVisible(false);
                handleSignIn();
              }}
              className="btn-press w-full py-2 text-[10px] text-bg"
              style={{
                backgroundColor: theme.accent,
                boxShadow: `2px 2px 0 0 ${theme.shadow}`,
              }}
            >
              Connect Wallet
            </button>
            <button
              onClick={() => setSignInPromptVisible(false)}
              className="mt-1.5 w-full py-1 text-[8px] text-dim transition-colors hover:text-muted"
            >
              Maybe later
            </button>
          </div>
        </div>
      )}

      {/* ─── A5: Ad redirect toast ─── */}
      {adToast && (
        <div className="fixed top-16 left-1/2 z-50 -translate-x-1/2 animate-[fade-in_0.15s_ease-out]">
          <div
            className="border-[3px] px-5 py-2.5 text-[10px] text-bg"
            style={{
              backgroundColor: theme.accent,
              borderColor: theme.shadow,
            }}
          >
            Opening {adToast} &rarr;
          </div>
        </div>
      )}

      {/* ─── A8: Ghost preview CTA ─── */}
      {ghostPreviewLogin && (
        <div className="fixed top-20 left-1/2 z-50 -translate-x-1/2 w-[calc(100%-1.5rem)] max-w-xs animate-[slide-up_0.2s_ease-out]">
          <div
            className="border-[3px] bg-bg-raised/95 px-4 py-3 backdrop-blur-sm"
            style={{ borderColor: theme.accent }}
          >
            <p className="text-[10px] text-cream normal-case mb-2 leading-relaxed">
              Unlock effects for your building
            </p>
            <p className="text-[8px] text-muted normal-case mb-2.5">
              Neon Outline, Particle Aura, Spotlight, and more
            </p>
            <Link
              href={`/${ghostPreviewLogin}`}
              onClick={() => setGhostPreviewLogin(null)}
              className="btn-press block w-full py-2 text-center text-[10px] text-bg"
              style={{
                backgroundColor: theme.accent,
                boxShadow: `2px 2px 0 0 ${theme.shadow}`,
              }}
            >
              View Protocol &rarr;
            </Link>
            <button
              onClick={() => setGhostPreviewLogin(null)}
              className="mt-1.5 w-full py-1 text-[8px] text-dim transition-colors hover:text-muted"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Streak reward removed — developer feature */}

      {/* ─── Building Profile Card ─── */}
      {/* Desktop: right edge, vertically centered. Mobile: bottom sheet, centered. */}
      {selectedBuilding && (!flyMode || flyPaused) && !comparePair && raidState.phase === "idle" && (
        <>
          {/* Nav hints — only on desktop, bottom-right */}
          <div className="pointer-events-none fixed bottom-6 right-6 z-30 hidden text-right text-[9px] leading-loose text-muted sm:block">
            <div><span className="text-cream">Drag</span> orbit</div>
            <div><span className="text-cream">Scroll</span> zoom</div>
            <div><span style={{ color: theme.accent }}>ESC</span> close</div>
          </div>

          {/* Card container — mobile: bottom sheet, desktop: fixed right side */}
          <div className="pointer-events-auto fixed z-40
            bottom-0 left-0 right-0
            sm:bottom-auto sm:left-auto sm:right-5 sm:top-1/2 sm:-translate-y-1/2"
          >
            <div className="relative border-t-[3px] border-border bg-bg-raised/95 backdrop-blur-sm
              w-full max-h-[50vh] overflow-y-auto sm:w-[320px] sm:border-[3px] sm:max-h-[85vh]
              animate-[slide-up_0.2s_ease-out] sm:animate-none"
            >
              {/* Close */}
              <button
                onClick={() => { setSelectedBuilding(null); setFocusedBuilding(null); }}
                className="absolute top-2 right-3 text-[10px] text-muted transition-colors hover:text-cream z-10"
              >
                ESC
              </button>

              {/* Drag handle on mobile */}
              <div className="flex justify-center py-2 sm:hidden">
                <div className="h-1 w-10 rounded-full bg-border" />
              </div>

              {/* Header with avatar + name */}
              <div className="flex items-center gap-3 px-4 pb-3 sm:pt-4">
                {selectedBuilding.isHouse ? (
                  <span
                    className="h-12 w-12 flex-shrink-0 border-[2px] border-border"
                    style={{
                      backgroundColor: selectedBuilding.custom_color || "#6090e0",
                      imageRendering: "pixelated",
                    }}
                  />
                ) : selectedBuilding.avatar_url ? (
                  <Image
                    src={selectedBuilding.avatar_url}
                    alt={selectedBuilding.login}
                    width={48}
                    height={48}
                    className="border-[2px] border-border flex-shrink-0"
                    style={{ imageRendering: "pixelated" }}
                  />
                ) : null}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {selectedBuilding.name && (
                      <p className="truncate text-sm text-cream">{selectedBuilding.name}</p>
                    )}
                    {selectedBuilding.isHouse ? (
                      <span
                        className="flex-shrink-0 px-1.5 py-0.5 text-[7px]"
                        style={{ color: "#14F195" }}
                      >
                        ★ Resident
                      </span>
                    ) : selectedBuilding.claimed ? (
                      <span
                        className="flex-shrink-0 px-1.5 py-0.5 text-[7px] text-bg"
                        style={{ backgroundColor: theme.accent }}
                      >
                        Claimed
                      </span>
                    ) : null}
                  </div>
                  <p className="truncate text-[10px] text-muted">
                    {selectedBuilding.isHouse
                      ? truncateAddress(selectedBuilding.login)
                      : `@${selectedBuilding.login}`}
                  </p>
                  {!selectedBuilding.isHouse && selectedBuilding.active_raid_tag && (
                    <p className="text-[8px] text-red-400">
                      Raided by @{selectedBuilding.active_raid_tag.attacker_login}
                    </p>
                  )}
                </div>
              </div>

              {/* Stats */}
              {selectedBuilding.isHouse ? (
                <div className="grid grid-cols-2 gap-px bg-border/30 mx-4 mb-3 border border-border/50">
                  {[
                    { label: "Type", value: "Resident House" },
                    { label: "Protocols", value: selectedBuilding.primary_language === "Resident" ? "—" : selectedBuilding.primary_language ?? "—" },
                  ].map((s) => (
                    <div key={s.label} className="bg-bg-card p-2 text-center">
                      <div className="text-xs" style={{ color: "#14F195" }}>{s.value}</div>
                      <div className="text-[8px] text-muted mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-px bg-border/30 mx-4 mb-3 border border-border/50">
                  {[
                    { label: "Rank", value: `#${selectedBuilding.rank}` },
                    { label: "TVL", value: fmtUsd(selectedBuilding.contributions) },
                    { label: "Volume", value: fmtUsd(selectedBuilding.total_stars) },
                    { label: "Category", value: selectedBuilding.primary_language?.split("|")[0]?.trim() ?? "—" },
                    { label: "Kudos", value: (selectedBuilding.kudos_count ?? 0).toLocaleString() },
                    { label: "Visits", value: (selectedBuilding.visit_count ?? 0).toLocaleString() },
                  ].map((s) => (
                    <div key={s.label} className="bg-bg-card p-2 text-center">
                      <div className="text-xs" style={{ color: theme.accent }}>{s.value}</div>
                      <div className="text-[8px] text-muted mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Protocol-only sections (skip for houses) */}
              {!selectedBuilding.isHouse && (
                <>
                  {/* Achievements with tier colors, sorted by tier */}
                  {selectedBuilding.achievements && selectedBuilding.achievements.length > 0 && (
                    <div className="mx-4 mb-3 flex flex-wrap gap-1">
                      {[...selectedBuilding.achievements]
                        .sort((a, b) => {
                          const tierOrder = ["diamond", "gold", "silver", "bronze"];
                          const ta = tierOrder.indexOf(ACHIEVEMENT_TIERS_MAP[a] ?? "bronze");
                          const tb = tierOrder.indexOf(ACHIEVEMENT_TIERS_MAP[b] ?? "bronze");
                          return ta - tb;
                        })
                        .slice(0, 3)
                        .map((ach) => {
                          const tier = ACHIEVEMENT_TIERS_MAP[ach];
                          const color = tier ? TIER_COLORS_MAP[tier] : undefined;
                          const emoji = tier ? TIER_EMOJI_MAP[tier] : "";
                          return (
                            <span
                              key={ach}
                              className="px-1.5 py-0.5 text-[8px] border normal-case"
                              style={{
                                borderColor: color ?? "rgba(255,255,255,0.15)",
                                color: color ?? "#a0a0b0",
                              }}
                            >
                              {emoji} {ACHIEVEMENT_NAMES_MAP[ach] ?? ach.replace(/_/g, " ")}
                            </span>
                          );
                        })}
                      {selectedBuilding.achievements.length > 3 && (
                        <Link
                          href={`/${selectedBuilding.login}`}
                          className="px-1.5 py-0.5 text-[8px] transition-colors hover:text-cream"
                          style={{ color: theme.accent }}
                        >
                          +{selectedBuilding.achievements.length - 3} more &rarr;
                        </Link>
                      )}
                    </div>
                  )}

                  {/* A7: Show equipped items on other devs' buildings (mimetic desire) */}
                  {selectedBuilding.login.toLowerCase() !== authLogin && (() => {
                    const equipped: string[] = [];
                    if (selectedBuilding.loadout?.crown) equipped.push(selectedBuilding.loadout.crown);
                    if (selectedBuilding.loadout?.roof) equipped.push(selectedBuilding.loadout.roof);
                    if (selectedBuilding.loadout?.aura) equipped.push(selectedBuilding.loadout.aura);
                    for (const fi of ["custom_color", "billboard", "led_banner"]) {
                      if (selectedBuilding.owned_items.includes(fi)) equipped.push(fi);
                    }
                    if (equipped.length === 0) return null;
                    const shown = equipped.slice(0, 3);
                    const extra = equipped.length - 3;
                    return (
                      <div
                        className="mx-4 mb-3 border-[2px] p-2.5"
                        style={{ borderColor: `${theme.accent}33`, backgroundColor: `${theme.accent}08` }}
                      >
                        <div className="flex flex-wrap gap-1.5">
                          {shown.map((id) => (
                            <span
                              key={id}
                              className="text-[9px] normal-case"
                              style={{ color: theme.accent }}
                            >
                              {ITEM_EMOJIS[id] ?? "🎁"} {ITEM_NAMES[id] ?? id}
                            </span>
                          ))}
                          {extra > 0 && (
                            <span className="text-[9px] text-muted">
                              +{extra} more
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Wallet interaction indicator */}
                  {walletAuth.isConnected && (() => {
                    const interaction = walletAuth.interactedProtocols.find(
                      (p) => p.protocol_slug === selectedBuilding.login
                    );
                    if (!interaction) return null;
                    return (
                      <div
                        className="mx-4 mb-3 border-[2px] p-2.5 text-center"
                        style={{ borderColor: "#14F19544", backgroundColor: "#14F19508" }}
                      >
                        <p className="text-[10px] normal-case" style={{ color: "#14F195" }}>
                          You&apos;ve interacted with this protocol ({interaction.tx_count} txs)
                        </p>
                      </div>
                    );
                  })()}

                  {/* Compare button */}
                  {!flyMode && (
                    <div className="mx-4 mb-3">
                      <button
                        onClick={() => {
                          setCompareBuilding(selectedBuilding);
                          setSelectedBuilding(null);
                          if (!exploreMode) setExploreMode(true);
                        }}
                        className="btn-press w-full border-[2px] border-border py-1.5 text-center text-[9px] text-cream transition-colors hover:border-border-light"
                      >
                        Compare
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Actions */}
              <div className="flex gap-2 p-4 pt-0 pb-5 sm:pb-4">
                {selectedBuilding.isHouse ? (
                  <>
                    <Link
                      href={`/wallet/${selectedBuilding.login}`}
                      className="btn-press flex-1 py-2 text-center text-[10px] text-bg"
                      style={{
                        backgroundColor: "#14F195",
                        boxShadow: "2px 2px 0 0 #0a7a4a",
                      }}
                    >
                      View Resident
                    </Link>
                    <a
                      href={`https://solscan.io/account/${selectedBuilding.login}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-press flex-1 border-[2px] border-border py-2 text-center text-[10px] text-cream transition-colors hover:border-border-light"
                    >
                      Solscan
                    </a>
                  </>
                ) : (
                  <>
                    <Link
                      href={`/${selectedBuilding.login}`}
                      className="btn-press flex-1 py-2 text-center text-[10px] text-bg"
                      style={{
                        backgroundColor: theme.accent,
                        boxShadow: `2px 2px 0 0 ${theme.shadow}`,
                      }}
                    >
                      View Protocol
                    </Link>
                    <a
                      href={`https://defillama.com/protocol/${selectedBuilding.login}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-press flex-1 border-[2px] border-border py-2 text-center text-[10px] text-cream transition-colors hover:border-border-light"
                    >
                      DeFiLlama
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ─── Compare Pick Prompt ─── */}
      {compareBuilding && !comparePair && !flyMode && (
        <div className="fixed top-3 left-1/2 z-40 -translate-x-1/2 w-[calc(100%-1.5rem)] max-w-sm sm:top-4 sm:w-auto">
          <div className="border-[3px] border-border bg-bg-raised/95 px-4 py-2.5 backdrop-blur-sm">
            <div className="flex items-center gap-3 min-w-0">
              <span
                className="blink-dot h-2 w-2 flex-shrink-0"
                style={{ backgroundColor: theme.accent }}
              />
              <span className="text-[10px] text-cream normal-case truncate min-w-0">
                Comparing <span style={{ color: theme.accent }}>@{compareBuilding.login}</span>
              </span>
              <button
                onClick={() => {
                  setSelectedBuilding(compareBuilding);
                  setFocusedBuilding(compareBuilding.login);
                  setCompareBuilding(null);
                }}
                className="ml-1 flex-shrink-0 text-[9px] text-muted transition-colors hover:text-cream"
              >
                Cancel
              </button>
            </div>
            {/* Self-compare hint */}
            {compareSelfHint && (
              <p className="mt-1 text-[9px] normal-case" style={{ color: "#f85149" }}>
                Pick a different building to compare
              </p>
            )}
            {/* Search field for compare pick */}
            <form
              onSubmit={(e) => { e.preventDefault(); searchUser(); }}
              className="mt-2 flex items-center gap-2"
            >
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (feedback?.type === "error") setFeedback(null);
                }}
                placeholder="search username to compare"
                className="min-w-0 flex-1 border-[2px] border-border bg-bg px-2.5 py-1.5 text-base sm:text-[10px] text-cream outline-none transition-colors placeholder:text-dim"
                onFocus={(e) => (e.currentTarget.style.borderColor = theme.accent)}
                onBlur={(e) => (e.currentTarget.style.borderColor = "")}
                autoFocus
              />
              <button
                type="submit"
                disabled={loading || !username.trim()}
                className="btn-press flex-shrink-0 px-3 py-1.5 text-[10px] text-bg disabled:opacity-40"
                style={{ backgroundColor: theme.accent }}
              >
                {loading ? "_" : "Go"}
              </button>
            </form>
            {feedback && (
              <div className="mt-1.5">
                <SearchFeedback feedback={feedback} accentColor={theme.accent} onDismiss={() => setFeedback(null)} onRetry={searchUser} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Comparison Panel ─── */}
      {comparePair && (() => {
        const compareStatDefs: { label: string; key: keyof CityBuilding; invert?: boolean }[] = [
          { label: "Rank", key: "rank", invert: true },
          { label: "Contributions", key: "contributions" },
          { label: "Stars", key: "total_stars" },
          { label: "Repos", key: "public_repos" },
          { label: "Kudos", key: "kudos_count" },
        ];
        let totalAWins = 0;
        let totalBWins = 0;
        const cmpRows = compareStatDefs.map((s) => {
          const a = (comparePair[0][s.key] as number) ?? 0;
          const b = (comparePair[1][s.key] as number) ?? 0;
          let aW = false, bW = false;
          if (s.invert) { aW = a > 0 && (a < b || b === 0); bW = b > 0 && (b < a || a === 0); }
          else { aW = a > b; bW = b > a; }
          if (aW) totalAWins++;
          if (bW) totalBWins++;
          return { ...s, a, b, aW, bW };
        });
        const cmpTie = totalAWins === totalBWins;
        const cmpWinner = totalAWins > totalBWins ? comparePair[0].login : comparePair[1].login;
        const cmpSummary = cmpTie
          ? `Tie ${totalAWins}-${totalBWins}`
          : `@${cmpWinner} wins ${Math.max(totalAWins, totalBWins)}-${Math.min(totalAWins, totalBWins)}`;

        const closeCompare = () => { setSelectedBuilding(comparePair[0]); setFocusedBuilding(comparePair[0].login); setComparePair(null); setCompareBuilding(null); };

        return (
        <>
          {/* No fullscreen backdrop — let the user orbit the camera freely */}
          <div className="pointer-events-auto fixed z-40
            bottom-0 left-0 right-0
            sm:bottom-auto sm:left-auto sm:right-5 sm:top-1/2 sm:-translate-y-1/2"
          >
            <div className="relative border-t-[3px] border-border bg-bg-raised/95 backdrop-blur-sm
              w-full sm:w-[380px] sm:border-[3px] sm:max-h-[85vh] sm:overflow-y-auto
              max-h-[45vh] overflow-y-auto
              animate-[slide-up_0.2s_ease-out] sm:animate-none"
            >
              {/* Drag handle on mobile - swipe down to close */}
              <div
                className="flex justify-center py-2 sm:hidden"
                onTouchStart={(e) => { (e.currentTarget as any)._touchY = e.touches[0].clientY; }}
                onTouchEnd={(e) => { const start = (e.currentTarget as any)._touchY; if (start != null && e.changedTouches[0].clientY - start > 50) closeCompare(); }}
              >
                <div className="h-1 w-10 rounded-full bg-border" />
              </div>

              {/* ── Header: Avatars + VS ── */}
              <div className="flex items-start justify-center gap-5 px-5 pt-1 pb-4 sm:pt-4">
                <Link href={`/${comparePair[0].login}`} className="flex flex-col items-center gap-1.5 group w-[110px]">
                  {comparePair[0].avatar_url && (
                    <Image
                      src={comparePair[0].avatar_url}
                      alt={comparePair[0].login}
                      width={56}
                      height={56}
                      className="border-[3px] transition-colors group-hover:brightness-110"
                      style={{
                        imageRendering: "pixelated",
                        borderColor: totalAWins >= totalBWins ? theme.accent : "#3a3a40",
                      }}
                    />
                  )}
                  <p className="truncate text-[10px] text-cream normal-case max-w-[110px] transition-colors group-hover:text-white">@{comparePair[0].login}</p>
                  <p className="text-[8px] text-muted normal-case text-center">{getDevClass(comparePair[0].login)}</p>
                </Link>

                <span className="text-base shrink-0 pt-4" style={{ color: theme.accent }}>VS</span>

                <Link href={`/${comparePair[1].login}`} className="flex flex-col items-center gap-1.5 group w-[110px]">
                  {comparePair[1].avatar_url && (
                    <Image
                      src={comparePair[1].avatar_url}
                      alt={comparePair[1].login}
                      width={56}
                      height={56}
                      className="border-[3px] transition-colors group-hover:brightness-110"
                      style={{
                        imageRendering: "pixelated",
                        borderColor: totalBWins >= totalAWins ? theme.accent : "#3a3a40",
                      }}
                    />
                  )}
                  <p className="truncate text-[10px] text-cream normal-case max-w-[110px] transition-colors group-hover:text-white">@{comparePair[1].login}</p>
                  <p className="text-[8px] text-muted normal-case text-center">{getDevClass(comparePair[1].login)}</p>
                </Link>
              </div>

              {/* ── Scoreboard ── */}
              <div className="mx-4 border-[2px] border-border bg-bg-card">
                {cmpRows.map((s, i) => (
                  <div
                    key={s.key}
                    className={`flex items-center py-2 px-3 ${i < cmpRows.length - 1 ? "border-b border-border/40" : ""}`}
                  >
                    <span
                      className="w-[72px] text-right text-[11px] tabular-nums"
                      style={{ color: s.aW ? theme.accent : s.bW ? "#555" : "#888" }}
                    >
                      {s.key === "rank" ? (s.a > 0 ? `#${s.a}` : "-") : s.a.toLocaleString()}
                    </span>
                    <span className="flex-1 text-center text-[8px] text-muted uppercase tracking-wider">
                      {s.label}
                    </span>
                    <span
                      className="w-[72px] text-left text-[11px] tabular-nums"
                      style={{ color: s.bW ? theme.accent : s.aW ? "#555" : "#888" }}
                    >
                      {s.key === "rank" ? (s.b > 0 ? `#${s.b}` : "-") : s.b.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>

              {/* ── Winner banner ── */}
              <div
                className="mx-4 mt-3 py-2.5 text-center text-[11px] uppercase tracking-wide"
                style={{
                  backgroundColor: `${theme.accent}15`,
                  border: `2px solid ${theme.accent}40`,
                  color: theme.accent,
                }}
              >
                {cmpSummary}
              </div>

              {/* ── Actions ── */}
              <div className="px-4 pt-3 pb-1 flex gap-2">
                <a
                  href={`https://x.com/intent/tweet?text=${encodeURIComponent(
                    `I just compared my building with ${comparePair[1].login}'s in Sol City. It wasn't even close. What's yours?`
                  )}&url=${encodeURIComponent(
                    `${typeof window !== "undefined" ? window.location.origin : ""}/compare/${comparePair[0].login}/${comparePair[1].login}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-press flex-1 py-2 text-center text-[10px] text-bg"
                  style={{
                    backgroundColor: theme.accent,
                    boxShadow: `2px 2px 0 0 ${theme.shadow}`,
                  }}
                >
                  Share on X
                </a>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${window.location.origin}/compare/${comparePair[0].login}/${comparePair[1].login}`
                    );
                    setCompareCopied(true);
                    setTimeout(() => setCompareCopied(false), 2000);
                  }}
                  className="btn-press flex-1 border-[2px] border-border py-2 text-center text-[10px] text-cream transition-colors hover:border-border-light"
                >
                  {compareCopied ? "Copied!" : "Copy Link"}
                </button>
              </div>

              {/* Download with lang toggle */}
              <div className="px-4 flex items-center gap-2 pb-1">
                <div className="flex gap-0.5 shrink-0">
                  {(["en", "pt"] as const).map((l) => (
                    <button
                      key={l}
                      onClick={() => setCompareLang(l)}
                      className="px-2 py-0.5 text-[9px] uppercase transition-colors"
                      style={{
                        color: compareLang === l ? theme.accent : "#666",
                        borderBottom: compareLang === l ? `2px solid ${theme.accent}` : "2px solid transparent",
                      }}
                    >
                      {l}
                    </button>
                  ))}
                </div>
                <button
                  onClick={async () => {
                    const res = await fetch(`/api/compare-card/${comparePair[0].login}/${comparePair[1].login}?format=landscape&lang=${compareLang}`);
                    if (!res.ok) return;
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `solcity-${comparePair[0].login}-vs-${comparePair[1].login}.png`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    URL.revokeObjectURL(url);
                  }}
                  className="btn-press flex-1 border-[2px] border-border py-1.5 text-center text-[9px] text-cream transition-colors hover:border-border-light"
                >
                  Card
                </button>
                <button
                  onClick={async () => {
                    const res = await fetch(`/api/compare-card/${comparePair[0].login}/${comparePair[1].login}?format=stories&lang=${compareLang}`);
                    if (!res.ok) return;
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `solcity-${comparePair[0].login}-vs-${comparePair[1].login}-stories.png`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    URL.revokeObjectURL(url);
                  }}
                  className="btn-press flex-1 border-[2px] border-border py-1.5 text-center text-[9px] text-cream transition-colors hover:border-border-light"
                >
                  Stories
                </button>
              </div>

              {/* Compare Again + Close */}
              <div className="flex gap-2 px-4 pt-1 pb-5 sm:pb-4">
                <button
                  onClick={() => {
                    const first = comparePair[0];
                    setComparePair(null);
                    setCompareBuilding(first);
                    setFocusedBuilding(first.login);
                  }}
                  className="btn-press flex-1 border-[2px] border-border py-2 text-center text-[10px] text-cream transition-colors hover:border-border-light"
                >
                  Compare Again
                </button>
                <button
                  onClick={closeCompare}
                  className="btn-press flex-1 border-[2px] border-border py-2 text-center text-[10px] text-cream transition-colors hover:border-border-light"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </>
        );
      })()}

      {/* ─── Share Modal ─── */}
      {shareData && !flyMode && !exploreMode && (
        <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-bg/70 backdrop-blur-sm"
            onClick={() => { setShareData(null); setSelectedBuilding(null); setFocusedBuilding(null); }}
          />

          {/* Modal */}
          <div className="relative mx-3 border-[3px] border-border bg-bg-raised p-4 text-center sm:mx-0 sm:p-6">
            {/* Close */}
            <button
              onClick={() => { setShareData(null); setSelectedBuilding(null); setFocusedBuilding(null); }}
              className="absolute top-2 right-3 text-[10px] text-muted transition-colors hover:text-cream"
            >
              &#10005;
            </button>

            {/* Avatar */}
            {shareData.avatar_url && (
              <Image
                src={shareData.avatar_url}
                alt={shareData.login}
                width={48}
                height={48}
                className="mx-auto mb-3 border-[2px] border-border"
                style={{ imageRendering: "pixelated" }}
              />
            )}

            <p className="text-xs text-cream normal-case">
              <span style={{ color: theme.accent }}>@{shareData.login}</span> joined the city!
            </p>

            <p className="mt-2 text-[10px] text-muted normal-case">
              Rank <span style={{ color: theme.accent }}>#{shareData.rank ?? "?"}</span>
              {" · "}
              <span style={{ color: theme.accent }}>{shareData.contributions.toLocaleString()}</span> contributions
            </p>

            {/* Buttons */}
            <div className="mt-4 flex flex-col items-center gap-2 sm:mt-5 sm:flex-row sm:justify-center sm:gap-3">
              <button
                onClick={() => {
                  if (!selectedBuilding && shareData) {
                    const b = buildings.find(
                      (b) => b.login.toLowerCase() === shareData.login.toLowerCase()
                    );
                    if (b) setSelectedBuilding(b);
                  }
                  setShareData(null);
                  setExploreMode(true);
                }}
                className="btn-press px-4 py-2 text-[10px] text-bg"
                style={{
                  backgroundColor: theme.accent,
                  boxShadow: `3px 3px 0 0 ${theme.shadow}`,
                }}
              >
                Explore Building
              </button>

              <a
                href={`https://x.com/intent/tweet?text=${encodeURIComponent(
                  `${shareData.login} is a building in Sol City. $${shareData.contributions.toLocaleString()} TVL, Rank #${shareData.rank ?? "?"}. Explore Solana protocols as a 3D city.`
                )}&url=${encodeURIComponent(
                  `${window.location.origin}/${shareData.login}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackShareClicked("x")}
                className="btn-press border-[3px] border-border px-4 py-2 text-[10px] text-cream transition-colors hover:border-border-light"
              >
                Share on X
              </a>

              <button
                onClick={() => {
                  trackShareClicked("copy_link");
                  navigator.clipboard.writeText(
                    `${window.location.origin}/dev/${shareData.login}`
                  );
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="btn-press border-[3px] border-border px-4 py-2 text-[10px] text-cream transition-colors hover:border-border-light"
              >
                {copied ? "Copied!" : "Copy Link"}
              </button>
            </div>

            {/* View profile link */}
            <a
              href={`/${shareData.login}`}
              className="mt-4 inline-block text-[9px] text-muted transition-colors hover:text-cream normal-case"
            >
              View full profile &rarr;
            </a>
          </div>
        </div>
      )}

      {/* ─── Sky Ad Card ─── */}
      {clickedAd && (
        <div
          className="fixed inset-0 z-50 bg-black/50"
          onClick={() => setClickedAd(null)}
          onKeyDown={(e) => { if (e.key === "Escape") setClickedAd(null); }}
          tabIndex={-1}
          ref={(el) => el?.focus()}
        >
          {/* Desktop: centered card. Mobile: bottom sheet */}
          <div className="pointer-events-none flex h-full items-end sm:items-center sm:justify-center">
            <div
              className="pointer-events-auto relative w-full border-t-[3px] border-border bg-bg-raised/95 backdrop-blur-sm
                sm:w-[340px] sm:mx-4 sm:border-[3px]
                animate-[slide-up_0.2s_ease-out] sm:animate-[fade-in_0.15s_ease-out]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close */}
              <button
                onClick={() => setClickedAd(null)}
                className="absolute top-2 right-3 text-[10px] text-muted transition-colors hover:text-cream z-10 cursor-pointer"
              >
                ESC
              </button>

              {/* Drag handle on mobile */}
              <div className="flex justify-center py-2 sm:hidden">
                <div className="h-1 w-10 rounded-full bg-border" />
              </div>

              {/* Header: brand + sponsored tag */}
              <div className="flex items-center gap-3 px-4 pb-3 sm:pt-4">
                <div
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center border-[2px]"
                  style={{ borderColor: clickedAd.color, color: clickedAd.color }}
                >
                  <span className="text-sm">{clickedAd.vehicle === "blimp" ? "\u25C6" : clickedAd.vehicle === "billboard" ? "\uD83D\uDCCB" : clickedAd.vehicle === "rooftop_sign" ? "\uD83D\uDD04" : clickedAd.vehicle === "led_wrap" ? "\uD83D\uDCA1" : "\u2708"}</span>
                </div>
                <div className="min-w-0 flex-1">
                  {clickedAd.brand && (
                    <p className="truncate text-sm text-cream">{clickedAd.brand}</p>
                  )}
                  <p className="text-[9px] text-dim">Sponsored</p>
                </div>
              </div>

              {/* Divider */}
              <div className="mx-4 mb-3 h-px bg-border" />

              {/* Description */}
              {clickedAd.description && (
                <p className="mx-4 mb-4 text-xs text-cream normal-case leading-relaxed">
                  {clickedAd.description}
                </p>
              )}

              {/* CTA */}
              {clickedAd.link && (() => {
                const ctaHref = buildAdLink(clickedAd) ?? clickedAd.link;
                const isMailto = clickedAd.link.startsWith("mailto:");
                return (
                  <div className="px-4 pb-5 sm:pb-4">
                    <a
                      href={ctaHref}
                      target={isMailto ? undefined : "_blank"}
                      rel={isMailto ? undefined : "noopener noreferrer"}
                      className="btn-press block w-full py-2.5 text-center text-[10px] text-bg"
                      style={{
                        backgroundColor: theme.accent,
                        boxShadow: `4px 4px 0 0 ${theme.shadow}`,
                      }}
                      onClick={() => {
                        track("sky_ad_click", { ad_id: clickedAd.id, vehicle: clickedAd.vehicle, brand: clickedAd.brand ?? "" });
                        trackAdEvent(clickedAd.id, "cta_click", authLogin || undefined);
                        trackSkyAdCtaClick(clickedAd.id, clickedAd.vehicle);
                      }}
                    >
                      {isMailto
                        ? "Send Email \u2192"
                        : `Visit ${new URL(clickedAd.link!).hostname.replace("www.", "")} \u2192`}
                    </a>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ─── Bottom-left controls: Theme + Radio ─── */}
      {!flyMode && !introMode && !rabbitCinematic && !exploreMode && (
        <div className="pointer-events-auto fixed bottom-10 left-3 z-[25] flex items-center gap-2 sm:left-4">
          <button
            onClick={() => setThemeIndex((i) => (i + 1) % THEMES.length)}
            className="btn-press flex items-center gap-1.5 border-[3px] border-border bg-bg/70 px-2.5 py-1 text-[10px] backdrop-blur-sm transition-colors hover:border-border-light"
          >
            <span style={{ color: theme.accent }}>&#9654;</span>
            <span className="text-cream">{theme.name}</span>
            <span className="text-dim">{themeIndex + 1}/{THEMES.length}</span>
          </button>
          <LofiRadio accent={theme.accent} shadow={theme.shadow} flyMode={flyMode} raidMode={raidState.phase !== "idle" && raidState.phase !== "preview"} />
          <button
            onClick={replayIntro}
            className="btn-press flex items-center gap-1 border-[3px] border-border bg-bg/70 px-2 py-1 text-[10px] backdrop-blur-sm transition-colors hover:border-border-light"
            title="Replay intro"
          >
            <span style={{ color: theme.accent }}>&#9654;</span>
            <span className="text-cream">Intro</span>
          </button>
        </div>
      )}
      {flyMode && (
        <div className="pointer-events-auto fixed bottom-4 left-3 z-[25] sm:left-4">
          <LofiRadio accent={theme.accent} shadow={theme.shadow} flyMode={flyMode} raidMode={raidState.phase !== "idle" && raidState.phase !== "preview"} />
        </div>
      )}


      {/* ─── Activity Ticker ─── */}
      {!flyMode && !introMode && !rabbitCinematic && feedEvents.length >= 1 && (
        <ActivityTicker
          events={feedEvents}
          onEventClick={(evt) => {
            if (compareBuilding || comparePair) return;
            const login = evt.actor?.login;
            if (login) {
              setFocusedBuilding(login);
              const found = buildings.find(b => b.login.toLowerCase() === login.toLowerCase());
              if (found) {
                setSelectedBuilding(found);
                if (!exploreMode) setExploreMode(true);
              }
            }
          }}
          onOpenPanel={() => setFeedPanelOpen(true)}
        />
      )}

      {/* ─── Gift Modal ─── */}
      {giftModalOpen && selectedBuilding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-bg/70 backdrop-blur-sm"
            onClick={() => { setGiftModalOpen(false); setGiftItems(null); }}
          />
          <div className="relative z-10 w-full max-w-[280px] border-[3px] border-border bg-bg-raised">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <h3 className="text-xs" style={{ color: theme.accent }}>Send Gift</h3>
                <p className="mt-0.5 text-[8px] text-muted normal-case">to @{selectedBuilding.login}</p>
              </div>
              <button
                onClick={() => { setGiftModalOpen(false); setGiftItems(null); }}
                className="text-xs text-muted hover:text-cream"
              >
                &#10005;
              </button>
            </div>

            {/* Items */}
            {giftItems === null ? (
              <p className="py-8 text-center text-[9px] text-dim normal-case animate-pulse">
                Loading...
              </p>
            ) : giftItems.length === 0 ? (
              <p className="py-8 text-center text-[9px] text-dim normal-case">
                No items available
              </p>
            ) : (
              <div className="max-h-72 overflow-y-auto scrollbar-thin">
                {giftItems.map((item) => {
                  const isBuying = giftBuying === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => !item.owned && handleGiftCheckout(item.id)}
                      disabled={!!giftBuying || item.owned}
                      className={`flex w-full items-center gap-3 border-b border-border/30 px-4 py-2.5 text-left transition-colors ${item.owned ? "opacity-35 cursor-not-allowed" : "hover:bg-bg-card/80 disabled:opacity-40"}`}
                    >
                      <span className="text-base shrink-0">{ITEM_EMOJIS[item.id] ?? "🎁"}</span>
                      <span className="flex-1 text-[10px] text-cream">
                        {ITEM_NAMES[item.id] ?? item.id}
                      </span>
                      <span className="text-[10px] shrink-0" style={{ color: item.owned ? undefined : theme.accent }}>
                        {item.owned ? "Owned" : isBuying ? "..." : `$${(item.price_usd_cents / 100).toFixed(2)}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Activity Panel (slide-in) ─── */}
      <ActivityPanel
        initialEvents={feedEvents}
        open={feedPanelOpen}
        onClose={() => setFeedPanelOpen(false)}
        onNavigate={(login) => {
          if (compareBuilding || comparePair) return;
          setFeedPanelOpen(false);
          setFocusedBuilding(login);
          const found = buildings.find(b => b.login.toLowerCase() === login.toLowerCase());
          if (found) {
            setSelectedBuilding(found);
            if (!exploreMode) setExploreMode(true);
          }
        }}
      />

      {/* Gift celebration modal removed — developer feature */}

      {/* Mark streak achievements as seen on check-in */}

      {/* Raid Preview Modal */}
      {raidState.phase === "preview" && raidState.previewData && (
        <RaidPreviewModal
          preview={raidState.previewData}
          loading={raidState.loading}
          error={raidState.error}
          onRaid={(boostPurchaseId, vehicleId) => raidActions.executeRaid(boostPurchaseId, vehicleId)}
          onCancel={raidActions.exitRaid}
        />
      )}

      {/* Raid Overlay (cinema bars + text + share) */}
      {raidState.phase !== "idle" && raidState.phase !== "preview" && (
        <RaidOverlay
          phase={raidState.phase}
          raidData={raidState.raidData}
          onSkip={raidActions.skipToShare}
          onExit={raidActions.exitRaid}
        />
      )}

      {/* Founder's Landmark modals */}
      {pillModalOpen && (
        <PillModal
          isLoggedIn={walletAuth.isConnected}
          hasClaimed={false}
          rabbitCompleted={rabbitProgress >= 5}
          onRedPill={() => {
            setPillModalOpen(false);
            setFounderMessageOpen(true);
          }}
          onBluePill={() => {
            setPillModalOpen(false);
            if (rabbitProgress >= 5) return;
            if (!walletAuth.isConnected) return;
            // Spawn rabbit BEFORE cinematic so camera flies past it
            setRabbitSighting(rabbitProgress + 1);
            setRabbitCinematic(true);
          }}
          onClose={() => setPillModalOpen(false)}
        />
      )}
      {founderMessageOpen && (
        <FounderMessage onClose={() => setFounderMessageOpen(false)} />
      )}

      {/* Rabbit Quest Cinematic Overlay */}
      {rabbitCinematic && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          {/* Letterbox bars */}
          <div
            className="absolute inset-x-0 top-0 origin-top bg-black/80 transition-transform duration-700"
            style={{ height: "12%", transform: rabbitCinematicPhase >= 0 ? "scaleY(1)" : "scaleY(0)" }}
          />
          <div
            className="absolute inset-x-0 bottom-0 origin-bottom bg-black/80 transition-transform duration-700"
            style={{ height: "18%", transform: rabbitCinematicPhase >= 0 ? "scaleY(1)" : "scaleY(0)" }}
          />

          {/* CRT scanlines */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,255,65,0.08) 1px, rgba(0,255,65,0.08) 2px)",
              backgroundSize: "100% 2px",
            }}
          />

          {/* Text in lower bar */}
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center" style={{ height: "18%" }}>
            {["Follow the white rabbit...", "It hides among the plazas..."].map((text, i) => (
              <p
                key={i}
                className="absolute text-center font-pixel normal-case px-4"
                style={{
                  fontSize: "clamp(0.85rem, 3vw, 1.5rem)",
                  letterSpacing: "0.08em",
                  color: "#00ff41",
                  textShadow: "0 0 20px rgba(0,255,65,0.5), 0 0 40px rgba(0,255,65,0.2)",
                  opacity: rabbitCinematicPhase === i ? 1 : 0,
                  transition: "opacity 0.7s ease-in-out",
                }}
              >
                {text}
              </p>
            ))}
          </div>

          {/* Skip button */}
          <button
            className="pointer-events-auto absolute top-4 right-4 z-[60] font-pixel text-[10px] sm:text-[12px] tracking-wider border border-[#00ff41]/40 px-3 py-1.5 transition-colors hover:bg-[#00ff41]/10"
            style={{
              color: "#00ff41",
              textShadow: "0 0 8px rgba(0,255,65,0.3)",
            }}
            onClick={endRabbitCinematic}
          >
            SKIP
          </button>
        </div>
      )}

      {/* Rabbit hint flash ("The rabbit moves deeper...") */}
      {rabbitHintFlash && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          style={{ animation: "rabbitHintAnim 3s ease-in-out forwards" }}
        >
          <div className="absolute inset-0 bg-black/60" />
          <p
            className="relative font-pixel text-[14px] sm:text-[16px] tracking-widest text-center px-4"
            style={{
              color: "#00ff41",
              textShadow: "0 0 15px rgba(0,255,65,0.5), 0 0 30px rgba(0,255,65,0.2)",
            }}
          >
            {rabbitHintFlash}
          </p>
          <style jsx>{`
            @keyframes rabbitHintAnim {
              0% { opacity: 0; }
              15% { opacity: 1; }
              70% { opacity: 1; }
              100% { opacity: 0; }
            }
          `}</style>
        </div>
      )}

      {/* Rabbit completion cinematic */}
      {rabbitCompletion && (
        <RabbitCompletion onComplete={() => setRabbitCompletion(false)} />
      )}

      {/* Wallet HUD — shows portfolio & protocol interactions when connected */}
      {walletAuth.isConnected && walletAuth.address && (
        <WalletHUD
          walletAddress={walletAuth.address}
          walletData={walletAuth.walletData}
          interactedProtocols={walletAuth.interactedProtocols}
          isResident={walletAuth.isResident}
          accentColor={theme.accent}
          onClaimHouse={async () => {
            if (!walletAuth.address) return;
            const res = await fetch("/api/resident/claim", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ address: walletAuth.address }),
            });
            if (res.ok) {
              // Reload city so the new house appears in the ring
              reloadCity(true);
            }
          }}
          onProtocolClick={(slug) => {
            const building = buildings.find((b) => b.login === slug);
            if (building) {
              setFocusedBuilding(slug);
              setSelectedBuilding(building);
              setExploreMode(true);
            }
          }}
          onResidentClick={() => {
            if (!walletAuth.address) return;
            const house = buildings.find((b) => b.isHouse && b.login === walletAuth.address);
            if (house) {
              setFocusedBuilding(walletAuth.address);
              setSelectedBuilding(house);
              setExploreMode(true);
            }
          }}
          claiming={walletAuth.connecting}
          houseColor={walletAuth.houseColor}
        />
      )}
    </main>
  );
}

export default function Home() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}
