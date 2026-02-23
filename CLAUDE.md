# CLAUDE.md — aivrie-openclaw-web

## Project Overview

Next.js website for Aivrie/OpenClaw, deployed on Vercel. Uses Supabase as the backend.

## Tech Stack

- **Framework:** Next.js 16 (App Router) with React 19
- **Styling:** Tailwind CSS 4
- **Language:** TypeScript 5
- **Hosting:** Vercel
- **Backend/DB:** Supabase (see `../aivrie-openclaw-supabase`)

## Branch Strategy

| Branch      | Environment | Supabase Target                  | Vercel Target        |
|-------------|-------------|----------------------------------|----------------------|
| `develop`   | Local dev   | Local Supabase via Docker        | N/A (localhost)      |
| `staging`   | Staging     | Staging Supabase (hosted)        | Vercel staging       |
| `main`      | Production  | Production Supabase (hosted)     | Vercel production    |

### Workflow

1. **Develop & test locally** on `develop`, running against a local Supabase instance in Docker.
2. **Push to `staging`** to verify everything works in a live Vercel environment against the hosted staging Supabase.
3. **Merge to `main`** when staging is verified and ready for production.

## Related Repos

- **`aivrie-openclaw-supabase`** (`../aivrie-openclaw-supabase`) — Supabase project (migrations, edge functions, seed data). Follows the same three-branch model (`develop` / `staging` / `main`).
