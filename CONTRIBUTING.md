# Contributing to Sol City

Thanks for your interest in contributing! Here's how to get started.

## Setup

```bash
git clone https://github.com/jorger3301/sol-city.git
cd sol-city
npm install
cp .env.example .env.local
# Fill in your keys (see .env.example for details)
node --env-file=.env.local scripts/setup-db.mjs
npm run dev
```

The app runs on [http://localhost:3000](http://localhost:3000).

## Requirements

- Node.js 18+
- A Supabase project (free tier works)
- A Helius API key (for wallet data and protocol detection)
- A Vybe Network API key (for PnL and trading stats)

## Code Style

- TypeScript everywhere
- Tailwind CSS v4 for styling
- Pixel font (Silkscreen) for UI text
- React Three Fiber (R3F) + drei for 3D
- App Router (Next.js 16)

Run `npm run lint` before submitting.

## Making Changes

1. Fork the repo
2. Create a branch from `main` (`git checkout -b feat/my-feature`)
3. Make your changes
4. Run `npm run lint` and fix any issues
5. Commit with a clear message (e.g. `feat: add rain weather effect`)
6. Open a Pull Request against `main`

## Commit Messages

Start with a type prefix. Single line, present tense, concise.

| Type | When |
|------|------|
| `feat` | New features |
| `fix` | Bug fixes |
| `refactor` | Code restructuring |
| `docs` | Documentation |
| `style` | Formatting, renaming |
| `perf` | Performance |
| `chore` | Maintenance |
| `test` | Tests |

**Examples:**

```
feat: add protocol comparison panel
fix: resolve wallet connection timeout
refactor: rename CityBuilding data model fields
chore: update dependencies
```

## Good First Issues

Look for issues labeled [`good first issue`](https://github.com/jorger3301/sol-city/labels/good%20first%20issue). These are scoped tasks that don't require deep knowledge of the codebase.

## Project Structure

```
src/
  app/          # Next.js App Router pages and API routes
  components/   # React components (UI + 3D)
  lib/          # Utilities, Supabase clients, helpers
  types/        # TypeScript types
public/         # Static assets (audio, images, fonts)
scripts/        # Database setup and cron scripts
```

## 3D / Three.js

The city is rendered with React Three Fiber. Key files:

- `src/components/CityScene.tsx` — Main 3D scene
- `src/components/InstancedBuildings.tsx` — Instanced mesh rendering for all buildings
- `src/components/Building3D.tsx` — Individual building detail rendering
- `src/lib/city-layout.ts` — Building layout, height/width calculations, and the `CityBuilding` data model

If you're adding a new building effect or visual feature, start with `city-layout.ts` for data and `InstancedBuildings.tsx` for rendering.

## Questions?

Open an issue on [GitHub](https://github.com/jorger3301/sol-city/issues).
