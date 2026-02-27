"use client"

import { useMemo } from "react"
import {
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
  Cell,
  LabelList,
} from "recharts"
import type { DashboardData } from "@/app/research/page"
import { TOOLTIP_STYLE, NICHE_COLORS, formatNumber, toNum } from "@/components/research/chart-utils"

// ─── Frequency ordering ──────────────────────────────────────────────────────
const FREQUENCY_ORDER = [
  "Daily",
  "3-4x/week",
  "Weekly",
  "Bi-Weekly",
  "Monthly",
  "Irregular",
] as const

// ─── Internal chart data shapes ──────────────────────────────────────────────
interface FreqRow {
  frequency: string
  avgSubscribers: number
  avgViewsPerVideo: number
}

interface NicheRow {
  niche: string
  normSubs: number
  normEngagement: number
  normViewsToSub: number
  rawSubs: number
  rawEngagement: number
  rawViewsToSub: number
}

interface LengthDot {
  name: string
  length: number
  avgViews: number
  subscribers: number
  niche: string
}

interface EngagementRow {
  contentType: string
  avgEngagement: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function avg(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

function groupBy<T>(items: T[], key: (item: T) => string | null): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const item of items) {
    const k = key(item)
    if (k == null || k === "") continue
    const arr = map.get(k)
    if (arr) arr.push(item)
    else map.set(k, [item])
  }
  return map
}

// ─── Component ───────────────────────────────────────────────────────────────
export function StrategyTab({ data }: { data: DashboardData }) {
  const { creators, videoStats } = data

  // 2.1 Upload Frequency vs Performance
  const freqData = useMemo<FreqRow[]>(() => {
    const grouped = groupBy(creators, (c) => c.uploadFrequency)
    const rows: FreqRow[] = []

    for (const freq of FREQUENCY_ORDER) {
      const group = grouped.get(freq)
      if (!group || group.length === 0) {
        rows.push({ frequency: freq, avgSubscribers: 0, avgViewsPerVideo: 0 })
        continue
      }
      rows.push({
        frequency: freq,
        avgSubscribers: avg(group.map((c) => toNum(c.subscribers))),
        avgViewsPerVideo: avg(group.map((c) => toNum(c.avgViewsPerVideo))),
      })
    }

    return rows
  }, [creators])

  // 2.2 Niche Performance (normalized 0-100)
  const nicheData = useMemo<NicheRow[]>(() => {
    const grouped = groupBy(creators, (c) => c.topContentType)
    const raw: { niche: string; avgSubs: number; avgEng: number; avgVSR: number }[] = []

    for (const [niche, group] of grouped) {
      const engagements = group
        .map((c) => videoStats.get(c.channelId)?.avgEngagement)
        .filter((v): v is number => v != null)

      raw.push({
        niche,
        avgSubs: avg(group.map((c) => toNum(c.subscribers))),
        avgEng: engagements.length > 0 ? avg(engagements) : 0,
        avgVSR: avg(group.map((c) => toNum(c.viewsToSubRatio))),
      })
    }

    const maxSubs = Math.max(...raw.map((r) => r.avgSubs), 1)
    const maxEng = Math.max(...raw.map((r) => r.avgEng), 1)
    const maxVSR = Math.max(...raw.map((r) => r.avgVSR), 1)

    return raw
      .map((r) => ({
        niche: r.niche,
        normSubs: (r.avgSubs / maxSubs) * 100,
        normEngagement: (r.avgEng / maxEng) * 100,
        normViewsToSub: (r.avgVSR / maxVSR) * 100,
        rawSubs: r.avgSubs,
        rawEngagement: r.avgEng,
        rawViewsToSub: r.avgVSR,
      }))
      .sort((a, b) => b.normSubs - a.normSubs)
  }, [creators, videoStats])

  // 2.3 Video Length Sweet Spot
  const lengthData = useMemo<LengthDot[]>(() => {
    return creators
      .filter(
        (c) =>
          c.typicalVideoLength != null &&
          c.typicalVideoLength > 0 &&
          c.avgViewsPerVideo != null &&
          c.avgViewsPerVideo > 0
      )
      .map((c) => ({
        name: c.title ?? "",
        length: c.typicalVideoLength as number,
        avgViews: c.avgViewsPerVideo as number,
        subscribers: Math.max(toNum(c.subscribers), 1),
        niche: c.topContentType ?? "Other",
      }))
  }, [creators])

  // 2.4 Content Type vs Engagement
  const engagementData = useMemo<EngagementRow[]>(() => {
    const grouped = groupBy(creators, (c) => c.topContentType)
    const rows: EngagementRow[] = []

    for (const [contentType, group] of grouped) {
      const engagements = group
        .map((c) => videoStats.get(c.channelId)?.avgEngagement)
        .filter((v): v is number => v != null)

      if (engagements.length > 0) {
        rows.push({
          contentType,
          avgEngagement: Math.round(avg(engagements) * 100) / 100,
        })
      }
    }

    return rows.sort((a, b) => b.avgEngagement - a.avgEngagement)
  }, [creators, videoStats])

  return (
    <div className="space-y-6">
      {/* Row 1: Charts 2.1 & 2.2 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 2.1 Upload Frequency vs Performance */}
        <div className="rounded-lg border p-5">
          <h3 className="text-sm font-semibold mb-4">
            Upload Frequency vs Performance
          </h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={freqData}
              margin={{ top: 5, right: 20, bottom: 5, left: 10 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                className="opacity-30"
                vertical={false}
              />
              <XAxis
                dataKey="frequency"
                tick={{ fontSize: 11 }}
                interval={0}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v: number) => formatNumber(v)}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(value: number | undefined, name?: string) => [
                  formatNumber(value ?? 0),
                  name === "avgSubscribers"
                    ? "Avg Subscribers"
                    : "Avg Views/Video",
                ]}
              />
              <Legend
                wrapperStyle={{ fontSize: "0.75rem" }}
                formatter={(value: string) =>
                  value === "avgSubscribers"
                    ? "Avg Subscribers"
                    : "Avg Views/Video"
                }
              />
              <Bar
                dataKey="avgSubscribers"
                fill="#3b82f6"
                radius={[2, 2, 0, 0]}
              />
              <Bar
                dataKey="avgViewsPerVideo"
                fill="#10b981"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 2.2 Niche Performance (normalized) */}
        <div className="rounded-lg border p-5">
          <h3 className="text-sm font-semibold mb-4">
            Niche Performance (normalized)
          </h3>
          <ResponsiveContainer
            width="100%"
            height={Math.max(nicheData.length * 40 + 40, 200)}
          >
            <BarChart
              data={nicheData}
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
                domain={[0, 100]}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                type="category"
                dataKey="niche"
                tick={{ fontSize: 11 }}
                width={95}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any, name: any, props: any) => {
                  const v = Number(value ?? 0)
                  const row = props?.payload as NicheRow | undefined
                  if (name === "normSubs")
                    return [
                      `${v.toFixed(0)} (${formatNumber(row?.rawSubs ?? 0)})`,
                      "Subscribers",
                    ]
                  if (name === "normEngagement")
                    return [
                      `${v.toFixed(0)} (${(row?.rawEngagement ?? 0).toFixed(2)}%)`,
                      "Engagement",
                    ]
                  return [
                    `${v.toFixed(0)} (${(row?.rawViewsToSub ?? 0).toFixed(1)}%)`,
                    "Views:Sub Ratio",
                  ]
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: "0.75rem" }}
                formatter={(value: string) => {
                  if (value === "normSubs") return "Subscribers"
                  if (value === "normEngagement") return "Engagement"
                  return "Views:Sub Ratio"
                }}
              />
              <Bar
                dataKey="normSubs"
                fill="#3b82f6"
                radius={[0, 2, 2, 0]}
              />
              <Bar
                dataKey="normEngagement"
                fill="#6366f1"
                radius={[0, 2, 2, 0]}
              />
              <Bar
                dataKey="normViewsToSub"
                fill="#10b981"
                radius={[0, 2, 2, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: Charts 2.3 & 2.4 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 2.3 Video Length Sweet Spot */}
        <div className="rounded-lg border p-5">
          <h3 className="text-sm font-semibold mb-4">
            Video Length Sweet Spot
          </h3>
          <ResponsiveContainer width="100%" height={360}>
            <ScatterChart
              margin={{ top: 10, right: 20, bottom: 10, left: 10 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                className="opacity-30"
              />
              <XAxis
                type="number"
                dataKey="length"
                name="Video Length"
                unit=" min"
                tick={{ fontSize: 11 }}
                label={{
                  value: "Typical Video Length (min)",
                  position: "insideBottom",
                  offset: -5,
                  style: { fontSize: 11, fill: "var(--color-muted-foreground)" },
                }}
              />
              <YAxis
                type="number"
                dataKey="avgViews"
                name="Avg Views"
                tick={{ fontSize: 11 }}
                tickFormatter={(v: number) => formatNumber(v)}
                label={{
                  value: "Avg Views / Video",
                  angle: -90,
                  position: "insideLeft",
                  offset: 0,
                  style: { fontSize: 11, fill: "var(--color-muted-foreground)" },
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
                formatter={(value: number | undefined, name?: string) => {
                  const v = value ?? 0
                  const n = name ?? ""
                  if (n === "Subscribers") return [formatNumber(v), n]
                  if (n === "Avg Views") return [formatNumber(v), n]
                  if (n === "Video Length") return [`${v} min`, n]
                  return [String(v), n]
                }}
                labelFormatter={(_label, payload) => {
                  if (payload && payload.length > 0) {
                    const item = payload[0].payload as LengthDot
                    return item.name
                  }
                  return ""
                }}
              />
              <Scatter data={lengthData} name="Creators">
                {lengthData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={NICHE_COLORS[entry.niche] ?? "#94a3b8"}
                    fillOpacity={0.75}
                    stroke={NICHE_COLORS[entry.niche] ?? "#94a3b8"}
                    strokeWidth={1}
                  />
                ))}
                <LabelList
                  dataKey="name"
                  position="top"
                  style={{ fontSize: 9, fill: "var(--color-muted-foreground)" }}
                />
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
          {/* Niche color legend */}
          <div className="flex flex-wrap gap-3 mt-3">
            {Object.entries(NICHE_COLORS).map(([niche, color]) => (
              <div key={niche} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span
                  className="inline-block size-2.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                {niche}
              </div>
            ))}
          </div>
        </div>

        {/* 2.4 Content Type vs Engagement */}
        <div className="rounded-lg border p-5">
          <h3 className="text-sm font-semibold mb-4">
            Content Type vs Engagement
          </h3>
          <ResponsiveContainer
            width="100%"
            height={Math.max(engagementData.length * 40 + 40, 200)}
          >
            <BarChart
              data={engagementData}
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
                tick={{ fontSize: 11 }}
                tickFormatter={(v: number) => `${v}%`}
              />
              <YAxis
                type="category"
                dataKey="contentType"
                tick={{ fontSize: 11 }}
                width={95}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(value: number | undefined) => [`${(value ?? 0).toFixed(2)}%`, "Avg Engagement"]}
              />
              <Bar
                dataKey="avgEngagement"
                fill="#6366f1"
                radius={[0, 2, 2, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
