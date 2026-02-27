"use client"

import { useMemo } from "react"
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ScatterChart,
  Scatter,
  ZAxis,
  LabelList,
} from "recharts"
import type { DashboardData, CreatorFull, VideoStats } from "@/app/research/page"
import {
  revenueToOrdinal,
  ordinalToRevenue,
  TOOLTIP_STYLE,
  formatNumber,
  toNum,
} from "@/components/research/chart-utils"

// ─── Revenue tier ordering & colors ─────────────────────────────────────────
const REVENUE_TIERS = [
  "<$1K/mo",
  "$1-5K/mo",
  "$5-10K/mo",
  "$10-50k/mo",
  "$50K+/mo",
] as const

type RevenueTier = (typeof REVENUE_TIERS)[number]

const REVENUE_COLORS: Record<RevenueTier, string> = {
  "<$1K/mo": "#ef4444",
  "$1-5K/mo": "#f97316",
  "$5-10K/mo": "#eab308",
  "$10-50k/mo": "#22c55e",
  "$50K+/mo": "#10b981",
}

// ─── Chart data row interfaces ──────────────────────────────────────────────
interface TierSlice {
  name: string
  value: number
  fill: string
}

interface TierMetricsRow {
  tier: string
  avgSubscribers: number
  avgEngagement: number
  avgVideoCount: number
}

interface MonetizationStackRow {
  method: string
  total: number
  "<$1K/mo": number
  "$1-5K/mo": number
  "$5-10K/mo": number
  "$10-50k/mo": number
  "$50K+/mo": number
}

interface DiversityDot {
  name: string
  monetizationCount: number
  revenueOrdinal: number
  subscribers: number
}

// ─── Custom tooltip payloads ────────────────────────────────────────────────
interface TooltipPayloadEntry<T> {
  payload: T
  name?: string
  value?: number
  color?: string
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function avg(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

function isRevenueTier(value: string): value is RevenueTier {
  return (REVENUE_TIERS as readonly string[]).includes(value)
}

// ─── Custom pie chart label renderer ────────────────────────────────────────
interface PieLabelProps {
  cx?: number
  cy?: number
  midAngle?: number
  innerRadius?: number
  outerRadius?: number
  name?: string
  value?: number
}

function renderPieLabel(props: PieLabelProps): React.ReactElement {
  const cx = props.cx ?? 0
  const cy = props.cy ?? 0
  const midAngle = props.midAngle ?? 0
  const outerRadius = props.outerRadius ?? 0
  const name = props.name ?? ""
  const value = props.value ?? 0

  const RADIAN = Math.PI / 180
  const radius = outerRadius + 25
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  return (
    <text
      x={x}
      y={y}
      fill="var(--color-foreground)"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      style={{ fontSize: 11 }}
    >
      {`${name}: ${value}`}
    </text>
  )
}

// ─── Component ──────────────────────────────────────────────────────────────
export function RevenueTab({ data }: { data: DashboardData }) {
  const { creators, videoStats } = data

  // ── 5.1 Revenue Tier Breakdown (Pie) ────────────────────────────────────
  const tierPieData = useMemo<TierSlice[]>(() => {
    const counts = new Map<RevenueTier, number>()
    for (const tier of REVENUE_TIERS) counts.set(tier, 0)

    for (const c of creators) {
      const rev = c.estRevenueRange
      if (rev != null && isRevenueTier(rev)) {
        counts.set(rev, (counts.get(rev) ?? 0) + 1)
      }
    }

    return REVENUE_TIERS.map((tier) => ({
      name: tier,
      value: counts.get(tier) ?? 0,
      fill: REVENUE_COLORS[tier],
    }))
  }, [creators])

  // ── 5.2 Revenue Tier vs Metrics (normalized grouped bar) ────────────────
  const tierMetricsData = useMemo<TierMetricsRow[]>(() => {
    const grouped = new Map<RevenueTier, CreatorFull[]>()
    for (const tier of REVENUE_TIERS) grouped.set(tier, [])

    for (const c of creators) {
      const rev = c.estRevenueRange
      if (rev != null && isRevenueTier(rev)) {
        grouped.get(rev)!.push(c)
      }
    }

    // Compute raw averages
    const raw = REVENUE_TIERS.map((tier) => {
      const group = grouped.get(tier) ?? []
      if (group.length === 0) {
        return { tier, avgSubs: 0, avgEng: 0, avgVids: 0 }
      }

      const engagements = group
        .map((c) => videoStats.get(c.channelId)?.avgEngagement)
        .filter((v): v is number => v != null)

      return {
        tier,
        avgSubs: avg(group.map((c) => toNum(c.subscribers))),
        avgEng: engagements.length > 0 ? avg(engagements) : 0,
        avgVids: avg(group.map((c) => toNum(c.videoCount))),
      }
    })

    // Normalize to 0-100 scale
    const maxSubs = Math.max(...raw.map((r) => r.avgSubs), 1)
    const maxEng = Math.max(...raw.map((r) => r.avgEng), 1)
    const maxVids = Math.max(...raw.map((r) => r.avgVids), 1)

    return raw.map((r) => ({
      tier: r.tier,
      avgSubscribers: Math.round((r.avgSubs / maxSubs) * 100 * 10) / 10,
      avgEngagement: Math.round((r.avgEng / maxEng) * 100 * 10) / 10,
      avgVideoCount: Math.round((r.avgVids / maxVids) * 100 * 10) / 10,
    }))
  }, [creators, videoStats])

  // ── 5.3 Monetization Frequency (horizontal stacked bar) ─────────────────
  const monetizationStackData = useMemo<MonetizationStackRow[]>(() => {
    // Collect all unique monetization methods
    const methodMap = new Map<string, Map<RevenueTier, number>>()

    for (const c of creators) {
      const methods = c.monetization
      const rev = c.estRevenueRange
      if (!methods || methods.length === 0) continue
      if (rev == null || !isRevenueTier(rev)) continue

      for (const method of methods) {
        if (!methodMap.has(method)) {
          const tierCounts = new Map<RevenueTier, number>()
          for (const tier of REVENUE_TIERS) tierCounts.set(tier, 0)
          methodMap.set(method, tierCounts)
        }
        const tierCounts = methodMap.get(method)!
        tierCounts.set(rev, (tierCounts.get(rev) ?? 0) + 1)
      }
    }

    // Build rows and sort by total count descending
    const rows: MonetizationStackRow[] = []
    for (const [method, tierCounts] of methodMap) {
      const lt1k = tierCounts.get("<$1K/mo") ?? 0
      const k1to5 = tierCounts.get("$1-5K/mo") ?? 0
      const k5to10 = tierCounts.get("$5-10K/mo") ?? 0
      const k10to50 = tierCounts.get("$10-50k/mo") ?? 0
      const k50plus = tierCounts.get("$50K+/mo") ?? 0
      rows.push({
        method,
        total: lt1k + k1to5 + k5to10 + k10to50 + k50plus,
        "<$1K/mo": lt1k,
        "$1-5K/mo": k1to5,
        "$5-10K/mo": k5to10,
        "$10-50k/mo": k10to50,
        "$50K+/mo": k50plus,
      })
    }

    return rows.sort((a, b) => b.total - a.total)
  }, [creators])

  // ── 5.4 Monetization Diversity (Scatter) ────────────────────────────────
  const diversityData = useMemo<DiversityDot[]>(() => {
    const filtered: CreatorFull[] = creators.filter(
      (c): c is CreatorFull =>
        c.monetization != null &&
        c.monetization.length > 0 &&
        c.estRevenueRange != null &&
        revenueToOrdinal(c.estRevenueRange) > 0
    )
    return filtered.map((c) => ({
      name: c.title,
      monetizationCount: c.monetization!.length,
      revenueOrdinal: revenueToOrdinal(c.estRevenueRange),
      subscribers: Math.max(toNum(c.subscribers), 1),
    }))
  }, [creators])

  return (
    <div className="space-y-6">
      {/* Row 1: Charts 5.1 & 5.2 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 5.1 Revenue Tier Breakdown */}
        <div className="rounded-lg border p-5">
          <h3 className="text-sm font-semibold mb-4">
            Revenue Tier Breakdown
          </h3>
          <ResponsiveContainer width="100%" height={360}>
            <PieChart>
              <Pie
                data={tierPieData}
                cx="50%"
                cy="50%"
                outerRadius={110}
                dataKey="value"
                nameKey="name"
                label={renderPieLabel}
              >
                {tierPieData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(value: number | undefined, name: string | undefined) => {
                  const v = value ?? 0
                  const total = tierPieData.reduce((s, d) => s + d.value, 0)
                  const pct = total > 0 ? ((v / total) * 100).toFixed(1) : "0"
                  return [`${v} creators (${pct}%)`, name ?? ""]
                }}
              />
              <Legend wrapperStyle={{ fontSize: "0.75rem" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* 5.2 Revenue Tier vs Metrics (normalized) */}
        <div className="rounded-lg border p-5">
          <h3 className="text-sm font-semibold mb-4">
            Revenue Tier vs Metrics (normalized)
          </h3>
          <ResponsiveContainer width="100%" height={360}>
            <BarChart
              data={tierMetricsData}
              margin={{ top: 5, right: 20, bottom: 5, left: 10 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                className="opacity-30"
                vertical={false}
              />
              <XAxis
                dataKey="tier"
                tick={{ fontSize: 11 }}
                interval={0}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                domain={[0, 100]}
                tickFormatter={(v: number) => `${v}`}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(value: number | undefined, name: string | undefined) => {
                  const label =
                    name === "avgSubscribers"
                      ? "Avg Subscribers"
                      : name === "avgEngagement"
                        ? "Avg Engagement"
                        : "Avg Video Count"
                  return [`${(value ?? 0).toFixed(1)}`, label]
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: "0.75rem" }}
                formatter={(value: string) => {
                  if (value === "avgSubscribers") return "Avg Subscribers"
                  if (value === "avgEngagement") return "Avg Engagement"
                  return "Avg Video Count"
                }}
              />
              <Bar
                dataKey="avgSubscribers"
                fill="#3b82f6"
                radius={[2, 2, 0, 0]}
              />
              <Bar
                dataKey="avgEngagement"
                fill="#6366f1"
                radius={[2, 2, 0, 0]}
              />
              <Bar
                dataKey="avgVideoCount"
                fill="#10b981"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: Charts 5.3 & 5.4 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 5.3 Monetization Frequency (horizontal stacked bar) */}
        <div className="rounded-lg border p-5">
          <h3 className="text-sm font-semibold mb-4">
            Monetization Frequency by Revenue Tier
          </h3>
          <ResponsiveContainer
            width="100%"
            height={Math.max(monetizationStackData.length * 40 + 60, 200)}
          >
            <BarChart
              data={monetizationStackData}
              layout="vertical"
              margin={{ left: 100, right: 20, top: 5, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                className="opacity-30"
                horizontal={false}
              />
              <XAxis
                type="number"
                allowDecimals={false}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                type="category"
                dataKey="method"
                tick={{ fontSize: 11 }}
                width={95}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(value: number | undefined, name: string | undefined) => [
                  `${value ?? 0} creators`,
                  name ?? "",
                ]}
              />
              <Legend wrapperStyle={{ fontSize: "0.75rem" }} />
              {REVENUE_TIERS.map((tier, i) => (
                <Bar
                  key={tier}
                  dataKey={tier}
                  stackId="monetization"
                  fill={REVENUE_COLORS[tier]}
                  radius={
                    i === REVENUE_TIERS.length - 1
                      ? [0, 2, 2, 0]
                      : [0, 0, 0, 0]
                  }
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 5.4 Monetization Diversity (Scatter) */}
        <div className="rounded-lg border p-5">
          <h3 className="text-sm font-semibold mb-4">
            Monetization Diversity vs Revenue
          </h3>
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart
              margin={{ top: 10, right: 20, bottom: 20, left: 10 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                className="opacity-30"
              />
              <XAxis
                type="number"
                dataKey="monetizationCount"
                name="Monetization Types"
                tick={{ fontSize: 11 }}
                allowDecimals={false}
                label={{
                  value: "Number of Monetization Types",
                  position: "insideBottom",
                  offset: -10,
                  style: {
                    fontSize: 11,
                    fill: "var(--color-muted-foreground)",
                  },
                }}
              />
              <YAxis
                type="number"
                dataKey="revenueOrdinal"
                name="Revenue Tier"
                domain={[0.5, 5.5]}
                ticks={[1, 2, 3, 4, 5]}
                tick={{ fontSize: 11 }}
                tickFormatter={(v: number) => ordinalToRevenue(v)}
                label={{
                  value: "Revenue Tier",
                  angle: -90,
                  position: "insideLeft",
                  offset: 5,
                  style: {
                    fontSize: 11,
                    fill: "var(--color-muted-foreground)",
                  },
                }}
              />
              <ZAxis
                type="number"
                dataKey="subscribers"
                range={[40, 400]}
                name="Subscribers"
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null
                  const row = (
                    payload[0] as TooltipPayloadEntry<DiversityDot>
                  ).payload
                  return (
                    <div style={TOOLTIP_STYLE} className="p-2 shadow-lg">
                      <p className="font-medium text-xs mb-1">{row.name}</p>
                      <p className="text-xs">
                        Monetization Types: {row.monetizationCount}
                      </p>
                      <p className="text-xs">
                        Revenue: {ordinalToRevenue(row.revenueOrdinal)}
                      </p>
                      <p className="text-xs">
                        Subscribers: {formatNumber(row.subscribers)}
                      </p>
                    </div>
                  )
                }}
              />
              <Scatter data={diversityData} name="Creators" fill="#6366f1">
                <LabelList
                  dataKey="name"
                  position="top"
                  style={{
                    fontSize: 9,
                    fill: "var(--color-muted-foreground)",
                  }}
                />
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
