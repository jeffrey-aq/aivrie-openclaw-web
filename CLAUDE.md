# CLAUDE.md — aivrie-openclaw-web

## Project Overview

Next.js website for Aivrie/OpenClaw, deployed on Vercel. Uses Supabase as the backend.

## Tech Stack

- **Framework:** Next.js 16 (App Router) with React 19
- **Styling:** Tailwind CSS 4
- **Language:** TypeScript 5
- **Hosting:** Vercel
- **Backend/DB:** Supabase (see `../aivrie-openclaw-supabase`)
- **Design:** Figma (MCP-connected)

## Branch Strategy

| Branch      | Environment   | Supabase Target           | Vercel Target        |
|-------------|---------------|---------------------------|----------------------|
| `develop`   | Development   | AIVRIE Development        | Vercel preview       |
| `main`      | Production    | AIVRIE Production         | Vercel production    |

### Workflow

1. **Develop & test** on `develop` — runs locally via `npm run dev` against the development Supabase project. Pushes deploy to Vercel as a preview.
2. **Merge to `main`** for production deployment on Vercel against the production Supabase project.

## MCP Interfaces

Three MCP servers are connected and should be used for their respective domains:

### Vercel MCP (`plugin:vercel`)

Primary interface for deployment and hosting operations. Prefer MCP over the Vercel CLI.

| Tool | Use |
|---|---|
| `deploy_to_vercel` | Deploy the project |
| `get_deployment` / `list_deployments` | Inspect deployments |
| `get_deployment_build_logs` | Build-time logs |
| `get_runtime_logs` | Runtime/function logs |
| `get_project` / `list_projects` | Project configuration |
| `search_vercel_documentation` | Search Vercel docs |
| `check_domain_availability_and_price` | Domain lookup |

### Figma MCP (`plugin:figma:figma`)

Design-to-code workflow. Use when implementing UI from Figma files or links.

| Tool | Use |
|---|---|
| `get_design_context` | **Primary tool** — returns code, screenshot, and hints for a Figma node |
| `get_screenshot` | Visual screenshot of a frame/component |
| `get_metadata` | File/node metadata |
| `generate_figma_design` | Write designs back into Figma |
| `get_code_connect_map` / `add_code_connect_map` | Map Figma components to codebase components |
| `create_design_system_rules` | Generate project-specific design rules |

**Workflow:** `get_design_context` → adapt output to this project's Next.js/Tailwind/shadcn stack → reuse existing `src/components/ui/` primitives and design tokens.

### Supabase MCP (`plugin:supabase:supabase`)

Query and inspect the backend database. Same MCP as the sibling `aivrie-openclaw-supabase` repo.

| Tool | Use |
|---|---|
| `execute_sql` | Run SQL queries |
| `list_tables` | List tables across schemas |
| `generate_typescript_types` | Generate TS types from the schema |
| `get_project` | Project details |
| `search_docs` | Search Supabase documentation |

**Project IDs:** Development = `nolcrchnkabehjvwaosr` (default), Production = `cnheteculgjqbpabwyux`.

## Related Repos

- **`aivrie-openclaw-supabase`** (`../aivrie-openclaw-supabase`) — Supabase project (migrations, seed data). Follows the same two-branch model (`develop` / `main`).
