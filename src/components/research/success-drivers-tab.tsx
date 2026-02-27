"use client"

import { useMemo } from "react"
import regression from "regression"
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
  Line,
  BarChart,
  Bar,
  LabelList,
  Cell,
} from "recharts"

import type { DashboardData } from "@/app/research/page"

import {
  percentile,
  TOOLTIP_STYLE,
  NICHE_COLORS,
  getCreatorColor,
  formatNumber,
  toNum,
} from "@/components/research/chart-utils"

// ─── Status colors for chart 1.2 ───────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  Active: "#22c55e",
  Rising: "#f59e0b",
  Monitoring: "#6b7280",
  Inactive: "#ef4444",
}

// ─── Score segment colors for chart 1.4 ─────────────────────────────────────
const SCORE_COLORS = {
  subscriber_pct: "#6366f1",
  engagement_pct: "#14b8a6",
  views_to_sub_pct: "#f59e0b",
  volume_pct: "#ec4899",
} as const

const SCORE_LABELS: Record<string, string> = {
  subscriber_pct: "Subscribers (30%)",
  engagement_pct: "Engagement (30%)",
  views_to_sub_pct: "Views/Sub Ratio (20%)",
  volume_pct: "Volume (20%)",
}

// ─── Data row interfaces for each chart ─────────────────────────────────────
interface EngagementScatterRow {
  name: string
  channelId: string
  subscribers: number
  avgEngagement: number
  totalViews: number
  niche: string
  color: string
}

interface ViewsSubRatioRow {
  name: string
  avgViewsPerVideo: number
  viewsToSubRatio: number
  status: string
  color: string
}

interface SubsViewsRow {
  name: string
  totalViews: number
  subscribers: number
  color: string
}

interface RegressionLinePoint {
  totalViews: number
  subscribers: number
}

interface ScoreRow {
  name: string
  subscriber_pct: number
  engagement_pct: number
  views_to_sub_pct: number
  volume_pct: number
  total: number
}

// ─── Custom tooltip payloads ────────────────────────────────────────────────
interface TooltipPayloadEntry<T> {
  payload: T
  name?: string
  value?: number
  color?: string
}

interface AvgViewsRow {
  name: string
  avgViewsShort: number
  avgViewsFull: number
}

// ─── Component ──────────────────────────────────────────────────────────────
export function SuccessDriversTab({ data }: { data: DashboardData }) {
  const { creators, videoStats } = data

  // ── Chart 1.0: Short vs Full Avg Views ────────────────────────────────
  const avgViewsData = useMemo<AvgViewsRow[]>(() => {
    return creators
      .map((c) => {
        const stats = videoStats.get(c.channelId)
        const avgShort = stats?.avgViewsShort ?? 0
        const avgFull = stats?.avgViewsFull ?? 0
        return {
          name: c.title,
          avgViewsShort: avgShort,
          avgViewsFull: avgFull,
          _max: Math.max(avgShort, avgFull),
        }
      })
      .filter((r) => r._max > 0)
      .sort((a, b) => b._max - a._max)
      .map(({ _max: _, ...rest }) => rest)
  }, [creators, videoStats])

  // ── Chart 1.1: Subscribers vs Engagement ────────────────────────────────
  const engagementData = useMemo<EngagementScatterRow[]>(() => {
    return creators
      .map((c) => {
        const stats = videoStats.get(c.channelId)
        const subscribers = toNum(c.subscribers)
        const avgEngagement = stats?.avgEngagement ?? 0
        const totalViews = toNum(c.totalViews)
        const niche = c.topContentType ?? "Other"
        return {
          name: c.title,
          channelId: c.channelId,
          subscribers: Math.max(subscribers, 1),
          avgEngagement,
          totalViews: Math.max(totalViews, 1),
          niche,
          color: NICHE_COLORS[niche] ?? getCreatorColor(c.channelId),
        }
      })
      .filter((d) => d.subscribers > 1 && d.avgEngagement > 0)
  }, [creators, videoStats])

  // ── Chart 1.2: Views-to-Sub Ratio vs Avg Views ─────────────────────────
  const viewsSubRatioData = useMemo<ViewsSubRatioRow[]>(() => {
    return creators
      .map((c) => {
        const avgViewsPerVideo = toNum(c.avgViewsPerVideo)
        const viewsToSubRatio = toNum(c.viewsToSubRatio)
        const status = c.status ?? "Monitoring"
        return {
          name: c.title,
          avgViewsPerVideo: Math.max(avgViewsPerVideo, 1),
          viewsToSubRatio,
          status,
          color: STATUS_COLORS[status] ?? STATUS_COLORS.Monitoring,
        }
      })
      .filter((d) => d.avgViewsPerVideo > 1 && d.viewsToSubRatio > 0)
  }, [creators])

  // ── Chart 1.3: Subscribers vs Total Views with regression ───────────────
  const subsViewsData = useMemo<SubsViewsRow[]>(() => {
    return creators
      .map((c) => {
        const totalViews = toNum(c.totalViews)
        const subscribers = toNum(c.subscribers)
        return {
          name: c.title,
          totalViews: Math.max(totalViews, 1),
          subscribers: Math.max(subscribers, 1),
          color: getCreatorColor(c.channelId),
        }
      })
      .filter((d) => d.totalViews > 1 && d.subscribers > 1)
  }, [creators])

  const regressionLine = useMemo<RegressionLinePoint[]>(() => {
    if (subsViewsData.length < 2) return []

    // Power regression: y = a * x^b
    const result = regression.power(
      subsViewsData.map((d) => [d.totalViews, d.subscribers] as [number, number]),
      { precision: 6 },
    )

    // Generate evenly-spaced points across the x range for a smooth line
    const xValues = subsViewsData.map((d) => d.totalViews)
    const minX = Math.min(...xValues)
    const maxX = Math.max(...xValues)
    const logMin = Math.log10(minX)
    const logMax = Math.log10(maxX)
    const steps = 50

    const line: RegressionLinePoint[] = []
    for (let i = 0; i <= steps; i++) {
      const logX = logMin + (logMax - logMin) * (i / steps)
      const x = Math.pow(10, logX)
      const predicted = result.predict(x)
      line.push({
        totalViews: x,
        subscribers: Math.max(predicted[1], 1),
      })
    }
    return line
  }, [subsViewsData])

  // ── Chart 1.4: Success Score Ranking ────────────────────────────────────
  const scoreData = useMemo<ScoreRow[]>(() => {
    // Collect raw values for percentile calculation
    const allSubscribers = creators.map((c) => toNum(c.subscribers))
    const allEngagement = creators.map((c) => videoStats.get(c.channelId)?.avgEngagement ?? 0)
    const allViewsToSub = creators.map((c) => toNum(c.viewsToSubRatio))
    const allVideoCount = creators.map((c) => toNum(c.videoCount))

    return creators
      .map((c) => {
        const stats = videoStats.get(c.channelId)
        const subPct = percentile(toNum(c.subscribers), allSubscribers)
        const engPct = percentile(stats?.avgEngagement ?? 0, allEngagement)
        const vtsRPct = percentile(toNum(c.viewsToSubRatio), allViewsToSub)
        const volPct = percentile(toNum(c.videoCount), allVideoCount)

        // Weighted score (0-100)
        const subscriberScore = subPct * 0.3
        const engagementScore = engPct * 0.3
        const viewsToSubScore = vtsRPct * 0.2
        const volumeScore = volPct * 0.2

        return {
          name: c.title,
          subscriber_pct: Math.round(subscriberScore * 10) / 10,
          engagement_pct: Math.round(engagementScore * 10) / 10,
          views_to_sub_pct: Math.round(viewsToSubScore * 10) / 10,
          volume_pct: Math.round(volumeScore * 10) / 10,
          total:
            Math.round(
              (subscriberScore + engagementScore + viewsToSubScore + volumeScore) * 10,
            ) / 10,
        }
      })
      .sort((a, b) => b.total - a.total)
  }, [creators, videoStats])

  // ── Unique niches for legend (chart 1.1) ────────────────────────────────
  const uniqueNiches = useMemo(() => {
    const niches = new Set(engagementData.map((d) => d.niche))
    return Array.from(niches).sort()
  }, [engagementData])

  // ── Unique statuses for legend (chart 1.2) ──────────────────────────────
  const uniqueStatuses = useMemo(() => {
    const statuses = new Set(viewsSubRatioData.map((d) => d.status))
    return Array.from(statuses).sort()
  }, [viewsSubRatioData])

  return (
    <div className="space-y-6">
      {/* ── 1.0: Short vs Full Avg Views (full width, horizontal) ── */}
      <div className="rounded-lg border p-5">
        <h3 className="text-sm font-semibold mb-4">
          Short vs Full-Length — Avg Views per Creator
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={avgViewsData}
            margin={{ top: 5, right: 20, bottom: 60, left: 10 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              className="opacity-30"
              vertical={false}
            />
            <XAxis
              dataKey="name"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              tick={((props: any) => (
                <text
                  x={props.x}
                  y={props.y + 4}
                  textAnchor="end"
                  fontSize={10}
                  fill="currentColor"
                  className="text-muted-foreground"
                  transform={`rotate(-90, ${props.x}, ${props.y + 4})`}
                >
                  {props.payload.value}
                </text>
              )) as any}
              interval={0}
              height={100}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickFormatter={(v: number) => formatNumber(v)}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(v: number | undefined, name?: string) => [
                formatNumber(v ?? 0),
                name === "avgViewsShort" ? "Avg Short" : "Avg Full",
              ]}
            />
            <Legend
              wrapperStyle={{ fontSize: "0.75rem" }}
              formatter={(value: string) =>
                value === "avgViewsShort" ? "Short" : "Full-Length"
              }
            />
            <Bar
              dataKey="avgViewsShort"
              fill="#ec4899"
              radius={[2, 2, 0, 0]}
            />
            <Bar
              dataKey="avgViewsFull"
              fill="#38bdf8"
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── 1.3 Subscribers vs Total Views (full width) ── */}
      <div className="rounded-lg border p-5">
        <h3 className="text-sm font-semibold mb-4">
          Subscribers vs Total Views (Power Regression)
        </h3>
        <ResponsiveContainer width="100%" height={450}>
          <ComposedChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis
              type="number"
              dataKey="totalViews"
              name="Total Views"
              scale="log"
              domain={["auto", "auto"]}
              tick={{ fontSize: 11 }}
              tickFormatter={(v: number) => formatNumber(v)}
              label={{
                value: "Total Views",
                position: "insideBottom",
                offset: -10,
                style: { fontSize: 11, fill: "var(--color-muted-foreground)" },
              }}
            />
            <YAxis
              type="number"
              dataKey="subscribers"
              name="Subscribers"
              scale="log"
              domain={["auto", "auto"]}
              tick={{ fontSize: 11 }}
              tickFormatter={(v: number) => formatNumber(v)}
              label={{
                value: "Subscribers",
                angle: -90,
                position: "insideLeft",
                offset: 5,
                style: { fontSize: 11, fill: "var(--color-muted-foreground)" },
              }}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null
                const entry = payload[0]
                if (!entry) return null
                // Could be a scatter point or regression line point
                const row = entry.payload as SubsViewsRow | RegressionLinePoint
                const hasName = "name" in row
                return (
                  <div style={TOOLTIP_STYLE} className="p-2 shadow-lg">
                    {hasName && (
                      <p className="font-medium text-xs mb-1">
                        {(row as SubsViewsRow).name}
                      </p>
                    )}
                    <p className="text-xs">
                      Total Views: {formatNumber(row.totalViews)}
                    </p>
                    <p className="text-xs">
                      Subscribers: {formatNumber(row.subscribers)}
                    </p>
                    {!hasName && (
                      <p className="text-xs italic text-muted-foreground">
                        Regression line
                      </p>
                    )}
                  </div>
                )
              }}
            />
            <Legend wrapperStyle={{ fontSize: "0.7rem" }} />
            <Line
              data={regressionLine}
              type="monotone"
              dataKey="subscribers"
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={false}
              name="Regression"
              legendType="line"
            />
            <Scatter
              data={subsViewsData}
              name="Creators"
              legendType="circle"
            >
              {subsViewsData.map((entry, i) => (
                <Cell key={`cell-${i}`} fill={entry.color} fillOpacity={0.7} />
              ))}
              <LabelList
                dataKey="name"
                position="top"
                style={{ fontSize: 9, fill: "var(--color-muted-foreground)" }}
              />
            </Scatter>
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* ── 1.4 Success Score Ranking (full width) ── */}
      <div className="rounded-lg border p-5">
        <h3 className="text-sm font-semibold mb-4">
          Composite Success Score Ranking
        </h3>
        <ResponsiveContainer
          width="100%"
          height={Math.max(scoreData.length * 32 + 60, 250)}
        >
          <BarChart
            data={scoreData}
            layout="vertical"
            margin={{ left: 120, right: 30, top: 5, bottom: 5 }}
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
              tickFormatter={(v: number) => `${v}`}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11 }}
              width={115}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null
                const row = (payload[0] as TooltipPayloadEntry<ScoreRow>).payload
                return (
                  <div style={TOOLTIP_STYLE} className="p-2 shadow-lg">
                    <p className="font-medium text-xs mb-2">{row.name}</p>
                    <div className="space-y-0.5">
                      {(
                        Object.keys(SCORE_COLORS) as Array<keyof typeof SCORE_COLORS>
                      ).map((key) => (
                        <div key={key} className="flex items-center gap-2 text-xs">
                          <span
                            className="inline-block size-2 rounded-full"
                            style={{ backgroundColor: SCORE_COLORS[key] }}
                          />
                          <span className="flex-1">{SCORE_LABELS[key]}</span>
                          <span className="tabular-nums font-medium">
                            {row[key].toFixed(1)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t mt-1.5 pt-1.5 flex justify-between text-xs font-semibold">
                      <span>Total</span>
                      <span className="tabular-nums">{row.total.toFixed(1)}</span>
                    </div>
                  </div>
                )
              }}
            />
            <Legend wrapperStyle={{ fontSize: "0.7rem" }} />
            <Bar
              dataKey="subscriber_pct"
              stackId="score"
              fill={SCORE_COLORS.subscriber_pct}
              name={SCORE_LABELS.subscriber_pct}
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="engagement_pct"
              stackId="score"
              fill={SCORE_COLORS.engagement_pct}
              name={SCORE_LABELS.engagement_pct}
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="views_to_sub_pct"
              stackId="score"
              fill={SCORE_COLORS.views_to_sub_pct}
              name={SCORE_LABELS.views_to_sub_pct}
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="volume_pct"
              stackId="score"
              fill={SCORE_COLORS.volume_pct}
              name={SCORE_LABELS.volume_pct}
              radius={[0, 2, 2, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Row: 1.1 + 1.2 scatter plots ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 1.1 Subscribers vs Engagement */}
        <div className="rounded-lg border p-5">
          <h3 className="text-sm font-semibold mb-4">
            Subscribers vs Engagement Rate
          </h3>
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                type="number"
                dataKey="subscribers"
                name="Subscribers"
                scale="log"
                domain={["auto", "auto"]}
                tick={{ fontSize: 11 }}
                tickFormatter={(v: number) => formatNumber(v)}
                label={{
                  value: "Subscribers",
                  position: "insideBottom",
                  offset: -10,
                  style: { fontSize: 11, fill: "var(--color-muted-foreground)" },
                }}
              />
              <YAxis
                type="number"
                dataKey="avgEngagement"
                name="Avg Engagement %"
                tick={{ fontSize: 11 }}
                tickFormatter={(v: number) => `${v.toFixed(1)}%`}
                label={{
                  value: "Avg Engagement %",
                  angle: -90,
                  position: "insideLeft",
                  offset: 5,
                  style: { fontSize: 11, fill: "var(--color-muted-foreground)" },
                }}
              />
              <ZAxis
                type="number"
                dataKey="totalViews"
                range={[40, 400]}
                name="Total Views"
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null
                  const row = (payload[0] as TooltipPayloadEntry<EngagementScatterRow>).payload
                  return (
                    <div style={TOOLTIP_STYLE} className="p-2 shadow-lg">
                      <p className="font-medium text-xs mb-1">{row.name}</p>
                      <p className="text-xs">Subscribers: {formatNumber(row.subscribers)}</p>
                      <p className="text-xs">Engagement: {row.avgEngagement.toFixed(2)}%</p>
                      <p className="text-xs">Total Views: {formatNumber(row.totalViews)}</p>
                      <p className="text-xs">Niche: {row.niche}</p>
                    </div>
                  )
                }}
              />
              <Scatter data={engagementData} shape="circle">
                {engagementData.map((entry, i) => (
                  <Cell key={`cell-${i}`} fill={entry.color} fillOpacity={0.7} />
                ))}
                <LabelList
                  dataKey="name"
                  position="top"
                  style={{ fontSize: 9, fill: "var(--color-muted-foreground)" }}
                />
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-2 px-2">
            {uniqueNiches.map((niche) => (
              <div key={niche} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="size-2.5 rounded-full" style={{ backgroundColor: NICHE_COLORS[niche] ?? "#8884d8" }} />
                {niche}
              </div>
            ))}
          </div>
        </div>

        {/* 1.2 Views-to-Sub Ratio vs Avg Views */}
        <div className="rounded-lg border p-5">
          <h3 className="text-sm font-semibold mb-4">
            Views-to-Sub Ratio vs Avg Views per Video
          </h3>
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                type="number"
                dataKey="avgViewsPerVideo"
                name="Avg Views/Video"
                scale="log"
                domain={["auto", "auto"]}
                tick={{ fontSize: 11 }}
                tickFormatter={(v: number) => formatNumber(v)}
                label={{
                  value: "Avg Views per Video",
                  position: "insideBottom",
                  offset: -10,
                  style: { fontSize: 11, fill: "var(--color-muted-foreground)" },
                }}
              />
              <YAxis
                type="number"
                dataKey="viewsToSubRatio"
                name="Views:Sub Ratio"
                tick={{ fontSize: 11 }}
                tickFormatter={(v: number) => `${v.toFixed(0)}%`}
                label={{
                  value: "Views:Sub Ratio %",
                  angle: -90,
                  position: "insideLeft",
                  offset: 5,
                  style: { fontSize: 11, fill: "var(--color-muted-foreground)" },
                }}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null
                  const row = (payload[0] as TooltipPayloadEntry<ViewsSubRatioRow>).payload
                  return (
                    <div style={TOOLTIP_STYLE} className="p-2 shadow-lg">
                      <p className="font-medium text-xs mb-1">{row.name}</p>
                      <p className="text-xs">
                        Avg Views/Video: {formatNumber(row.avgViewsPerVideo)}
                      </p>
                      <p className="text-xs">
                        Views:Sub Ratio: {row.viewsToSubRatio.toFixed(1)}%
                      </p>
                      <p className="text-xs">Status: {row.status}</p>
                    </div>
                  )
                }}
              />
              <Scatter data={viewsSubRatioData} shape="circle">
                {viewsSubRatioData.map((entry, i) => (
                  <Cell key={`cell-${i}`} fill={entry.color} fillOpacity={0.7} />
                ))}
                <LabelList
                  dataKey="name"
                  position="top"
                  style={{ fontSize: 9, fill: "var(--color-muted-foreground)" }}
                />
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-2 px-2">
            {uniqueStatuses.map((status) => (
              <div key={status} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="size-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[status] ?? STATUS_COLORS.Monitoring }} />
                {status}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
