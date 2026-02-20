import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase-server";
import type { TopRepo } from "@/lib/github";
import ClaimButton from "@/components/ClaimButton";

interface Props {
  params: Promise<{ username: string }>;
}

async function getDeveloper(username: string) {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("developers")
    .select("*")
    .eq("github_login", username.toLowerCase())
    .single();
  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const dev = await getDeveloper(username);

  if (!dev) {
    return { title: "Developer Not Found - Git City" };
  }

  const description = `#${dev.rank ?? "?"} in Git City — ${dev.contributions.toLocaleString()} contributions, ${dev.public_repos} repos, ${dev.total_stars.toLocaleString()} stars`;

  return {
    title: `@${dev.github_login} - Git City`,
    description,
    openGraph: {
      title: `@${dev.github_login} - Git City`,
      description,
    },
  };
}

export default async function DevPage({ params }: Props) {
  const { username } = await params;
  const dev = await getDeveloper(username);

  if (!dev) notFound();

  const accent = "#c8e64a";
  const topRepos: TopRepo[] = dev.top_repos ?? [];

  return (
    <main className="min-h-screen bg-bg font-pixel uppercase text-warm">
      <div className="mx-auto max-w-2xl px-4 py-10">
        {/* Header */}
        <Link
          href="/"
          className="mb-8 inline-block text-sm text-muted transition-colors hover:text-cream"
        >
          &larr; Back to City
        </Link>

        {/* Profile Card */}
        <div className="border-[3px] border-border bg-bg-raised p-8">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            {dev.avatar_url && (
              <Image
                src={dev.avatar_url}
                alt={dev.github_login}
                width={100}
                height={100}
                className="border-[3px] border-border"
                style={{ imageRendering: "pixelated" }}
              />
            )}

            <div className="flex-1">
              {dev.name && (
                <h1 className="text-2xl text-cream">{dev.name}</h1>
              )}
              <p className="mt-1 text-sm text-muted">@{dev.github_login}</p>

              {/* Rank Badge */}
              {dev.rank && (
                <div className="mt-3 inline-block border-[2px] px-3 py-1 text-sm" style={{ borderColor: accent, color: accent }}>
                  #{dev.rank} in the city
                </div>
              )}

              {/* Claim */}
              <div className="mt-3">
                <ClaimButton githubLogin={dev.github_login} claimed={dev.claimed ?? false} />
              </div>
            </div>
          </div>

          {/* Bio */}
          {dev.bio && (
            <p className="mt-5 text-sm leading-relaxed text-muted normal-case">
              {dev.bio}
            </p>
          )}
        </div>

        {/* Stats Grid */}
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Contributions", value: dev.contributions.toLocaleString() },
            { label: "Repos", value: dev.public_repos.toLocaleString() },
            { label: "Stars", value: dev.total_stars.toLocaleString() },
            { label: "Language", value: dev.primary_language ?? "—" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="border-[3px] border-border bg-bg-card p-4 text-center"
            >
              <div className="text-xl" style={{ color: accent }}>
                {stat.value}
              </div>
              <div className="mt-2 text-xs text-muted">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Top Repos */}
        {topRepos.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-4 text-sm text-cream">Top Repos</h2>
            <div className="space-y-2">
              {topRepos.map((repo) => (
                <a
                  key={repo.name}
                  href={repo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between border-[3px] border-border bg-bg-card px-5 py-3.5 transition-colors hover:border-border-light"
                >
                  <span className="text-sm text-cream normal-case">
                    {repo.name}
                  </span>
                  <div className="flex items-center gap-4 text-xs text-muted">
                    {repo.language && <span>{repo.language}</span>}
                    <span style={{ color: accent }}>
                      &#9733; {repo.stars}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* View in City Button */}
        <div className="mt-10 text-center">
          <Link
            href={`/?user=${dev.github_login}`}
            className="btn-press inline-block px-8 py-4 text-base text-bg"
            style={{
              backgroundColor: accent,
              boxShadow: "4px 4px 0 0 #5a7a00",
            }}
          >
            View in City
          </Link>
        </div>

        {/* GitHub link */}
        <div className="mt-6 text-center">
          <a
            href={`https://github.com/${dev.github_login}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted transition-colors hover:text-cream normal-case"
          >
            github.com/{dev.github_login} &rarr;
          </a>
        </div>
      </div>
    </main>
  );
}
