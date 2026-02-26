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

| Branch      | Environment   | Supabase Target           | Vercel Target        |
|-------------|---------------|---------------------------|----------------------|
| `develop`   | Development   | AIVRIE Development        | Vercel preview       |
| `main`      | Production    | AIVRIE Production         | Vercel production    |

### Workflow

1. **Develop & test** on `develop` — runs locally via `npm run dev` against the development Supabase project. Pushes deploy to Vercel as a preview.
2. **Merge to `main`** for production deployment on Vercel against the production Supabase project.

## Related Repos

- **`aivrie-openclaw-supabase`** (`../aivrie-openclaw-supabase`) — Supabase project (migrations, seed data). Follows the same two-branch model (`develop` / `main`).
