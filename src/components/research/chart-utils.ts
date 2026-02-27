// ─── Shared chart utilities for YouTube analytics dashboards ─────────────────

/** Compute the percentile rank (0-100) of a value within an array of numbers */
export function percentile(value: number, values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  let rank = 0
  for (const v of sorted) {
    if (v < value) rank++
    else break
  }
  return Math.round((rank / sorted.length) * 100)
}

/** Revenue string → ordinal number for scatter axes */
export function revenueToOrdinal(rev: string | null): number {
  const map: Record<string, number> = {
    "<$1K/mo": 1,
    "$1-5K/mo": 2,
    "$5-10K/mo": 3,
    "$10-50k/mo": 4,
    "$50K+/mo": 5,
  }
  return map[rev ?? ""] ?? 0
}

/** Revenue ordinal → display label */
export function ordinalToRevenue(ord: number): string {
  const map: Record<number, string> = {
    1: "<$1K/mo",
    2: "$1-5K/mo",
    3: "$5-10K/mo",
    4: "$10-50k/mo",
    5: "$50K+/mo",
  }
  return map[ord] ?? "Unknown"
}

/** Upload frequency string → numeric score (higher = more frequent) */
export function frequencyToScore(freq: string | null): number {
  const map: Record<string, number> = {
    Daily: 6,
    "3-4x/week": 5,
    Weekly: 4,
    "Bi-Weekly": 3,
    Monthly: 2,
    Irregular: 1,
  }
  return map[freq ?? ""] ?? 0
}

/** Consistent tooltip style matching the app's design tokens */
export const TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: "0.375rem",
  fontSize: "0.75rem",
}

/** Niche/content-type color map for chart elements */
export const NICHE_COLORS: Record<string, string> = {
  News: "#6366f1",
  Tutorials: "#14b8a6",
  "Case Studies": "#a855f7",
  Coding: "#06b6d4",
  Interviews: "#ec4899",
  Reviews: "#eab308",
  "Tool Demos": "#84cc16",
}

/** Hex colors for individual creators (deterministic via hash) */
const CREATOR_HEX_PALETTE = [
  "#8b5cf6", "#f59e0b", "#14b8a6", "#f43f5e", "#38bdf8",
  "#f97316", "#6366f1", "#84cc16", "#d946ef", "#06b6d4",
  "#ef4444", "#22c55e", "#ec4899", "#3b82f6", "#eab308",
  "#10b981", "#fb7185", "#22d3ee", "#a855f7", "#fbbf24",
]

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

/** Get a deterministic hex color for a creator by channelId */
export function getCreatorColor(channelId: string): string {
  return CREATOR_HEX_PALETTE[hashString(channelId) % CREATOR_HEX_PALETTE.length]
}

/** Threat level → color for scatter plots */
export const THREAT_COLORS: Record<string, string> = {
  High: "#ef4444",
  Medium: "#f59e0b",
  Low: "#22c55e",
}

/** Format large numbers compactly */
export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

/** Safely convert unknown values to number */
export function toNum(v: unknown): number {
  if (v == null) return 0
  const n = Number(v)
  return isNaN(n) ? 0 : n
}
