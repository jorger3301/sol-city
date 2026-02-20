import { createClient } from "@supabase/supabase-js";

// ─── Config ──────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN!;

if (!SUPABASE_URL || !SUPABASE_KEY || !GITHUB_TOKEN) {
  console.error(
    "Missing env vars. Make sure NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and GITHUB_TOKEN are set."
  );
  console.error("Run: source .env.local && npx tsx scripts/seed.ts");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

// ─── Top devs list ───────────────────────────────────────────

const TOP_DEVS = [
  "torvalds", "sindresorhus", "gaearon", "yyx990803", "tj",
  "addyosmani", "getify", "kentcdodds", "trekhleb", "kamranahmedse",
  "karpathy", "antirez", "mrdoob", "substack", "defunkt",
  "mojombo", "matz", "fabpot", "taylorotwell", "dhh",
  "wycats", "rauchg", "developit", "Rich-Harris", "swyx",
  "ThePrimeagen", "tiangolo", "charliermarsh", "astral-sh", "shadcn",
  "leerob", "cassidoo", "benawad", "thecodeholic", "fireship-io",
  "wesbos", "bradtraversy", "traversymedia", "florinpop17", "john-smilga",
  "jaredpalmer", "tannerlinsley", "pmndrs", "diegomura", "guilhermeborges",
  "FiloSottile", "jessfraz", "bradfitz", "rsc", "robpike",
  "mitchellh", "fatih", "junegunn", "sharkdp", "BurntSushi",
  "dtolnay", "alexcrichton", "withoutboats", "matklad", "jonhoo",
  "anuraghazra", "DenverCoder1", "Ileriayo", "abhisheknaiidu", "rahuldkjain",
  "tiimgreen", "ikatyang", "caarlos0", "gorhill", "nicolo-ribaudo",
  "ljharb", "isaacs", "domenic", "feross", "mafintosh",
  "mcollina", "mikeal", "ry", "denoland", "lucacasonato",
  "bartlomieju", "nickytonline", "JakeWharton", "chrisbanes",
  "romainguy", "diogocautiero", "gabrielpinto",
  "felipefialho", "omariosouto", "filipedeschamps",
  "diego3g", "maykbrito", "rocketseat",
  "jaydenseric", "apollographql", "leerob",
  "vercel", "zeit", "facebook", "google", "microsoft",
  "apple", "amazon", "netflix", "twitter",
];

// ─── GitHub Helpers ──────────────────────────────────────────

const ghHeaders = {
  Accept: "application/vnd.github.v3+json",
  Authorization: `Bearer ${GITHUB_TOKEN}`,
  "User-Agent": "git-city-seed",
};

async function fetchContributions(login: string): Promise<number> {
  const query = `
    query($login: String!) {
      user(login: $login) {
        contributionsCollection {
          contributionCalendar {
            totalContributions
          }
        }
      }
    }
  `;

  try {
    const res = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables: { login } }),
    });

    if (!res.ok) return 0;
    const json = await res.json();
    return (
      json?.data?.user?.contributionsCollection?.contributionCalendar
        ?.totalContributions ?? 0
    );
  } catch {
    return 0;
  }
}

async function fetchAndUpsert(login: string): Promise<boolean> {
  try {
    // Fetch user profile
    const userRes = await fetch(
      `https://api.github.com/users/${encodeURIComponent(login)}`,
      { headers: ghHeaders }
    );

    if (!userRes.ok) {
      console.log(`  [SKIP] ${login} - ${userRes.status}`);
      return false;
    }

    const ghUser = await userRes.json();

    // Check if it's actually a user (not an org with type "Organization")
    if (ghUser.type === "Organization") {
      console.log(`  [SKIP] ${login} - organization`);
      return false;
    }

    // Fetch repos
    const reposRes = await fetch(
      `https://api.github.com/users/${encodeURIComponent(login)}/repos?sort=pushed&per_page=100`,
      { headers: ghHeaders }
    );

    const repos: Array<{
      name: string;
      stargazers_count: number;
      language: string | null;
      html_url: string;
      fork: boolean;
      size: number;
    }> = reposRes.ok ? await reposRes.json() : [];

    // Contributions
    const contributions = await fetchContributions(ghUser.login);

    // Derived fields
    const ownRepos = repos.filter((r) => !r.fork);
    const totalStars = ownRepos.reduce((s, r) => s + r.stargazers_count, 0);

    const langCounts: Record<string, number> = {};
    for (const repo of ownRepos) {
      if (repo.language) {
        langCounts[repo.language] =
          (langCounts[repo.language] || 0) + repo.size;
      }
    }
    const primaryLanguage =
      Object.entries(langCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;

    const topRepos = ownRepos
      .sort((a, b) => b.stargazers_count - a.stargazers_count)
      .slice(0, 5)
      .map((r) => ({
        name: r.name,
        stars: r.stargazers_count,
        language: r.language,
        url: r.html_url,
      }));

    // Upsert
    const { error } = await sb.from("developers").upsert(
      {
        github_login: ghUser.login.toLowerCase(),
        github_id: ghUser.id,
        name: ghUser.name,
        avatar_url: ghUser.avatar_url,
        bio: ghUser.bio,
        contributions,
        public_repos: ghUser.public_repos,
        total_stars: totalStars,
        primary_language: primaryLanguage,
        top_repos: topRepos,
        fetched_at: new Date().toISOString(),
      },
      { onConflict: "github_login" }
    );

    if (error) {
      console.log(`  [ERR]  ${login} - ${error.message}`);
      return false;
    }

    console.log(
      `  [OK]   ${ghUser.login} — ${contributions} contribs, ${totalStars} stars`
    );
    return true;
  } catch (err) {
    console.log(`  [ERR]  ${login} - ${err}`);
    return false;
  }
}

// ─── Main ────────────────────────────────────────────────────

async function main() {
  console.log(`\nSeeding Git City with ${TOP_DEVS.length} developers...\n`);

  // Deduplicate
  const unique = [...new Set(TOP_DEVS.map((d) => d.toLowerCase()))];

  let success = 0;
  let failed = 0;

  for (const login of unique) {
    const ok = await fetchAndUpsert(login);
    if (ok) success++;
    else failed++;

    // 1s delay between requests
    await new Promise((r) => setTimeout(r, 1000));
  }

  // Recalculate ranks
  console.log("\nRecalculating ranks...");
  const { error } = await sb.rpc("recalculate_ranks");
  if (error) {
    console.error("Failed to recalculate ranks:", error.message);
  } else {
    console.log("Ranks updated.");
  }

  console.log(`\nDone! ${success} added, ${failed} skipped/failed.\n`);
}

main().catch(console.error);
