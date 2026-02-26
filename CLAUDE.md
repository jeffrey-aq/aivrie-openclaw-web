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
| `develop`   | Local dev   | Hosted Supabase staging project  | N/A (localhost)      |
| `staging`   | Staging     | Hosted Supabase staging project  | Vercel staging       |
| `main`      | Production  | Hosted Supabase production project | Vercel production  |

`develop` and `staging` share the same hosted Supabase instance (staging project). There is no local Docker Supabase — all environments use hosted Supabase.

### Workflow

1. **Develop & test locally** on `develop`, running `npm run dev` against the hosted Supabase staging project.
2. **Push to `staging`** to verify everything works in a live Vercel environment.
3. **Merge to `main`** when staging is verified and ready for production.

## Related Repos

- **`aivrie-openclaw-supabase`** (`../aivrie-openclaw-supabase`) — Supabase project (migrations, edge functions, seed data). Follows the same three-branch model (`develop` / `staging` / `main`).
