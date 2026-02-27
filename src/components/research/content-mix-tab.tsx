"use client"

import { useMemo, useState } from "react"
import regression from "regression"
import { TrendingUp, BarChart3 } from "lucide-react"
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
  ComposedChart,
  Line,
  Area,
} from "recharts"
import type {
  DashboardData,
  CreatorFull,
  VideoRow,
  VideoStats,
  HistogramRow,
} from "@/app/research/page"
import {
  TOOLTIP_STYLE,
  getCreatorColor,
  formatNumber,
  toNum,
} from "@/components/research/chart-utils"

// ─── Histogram helpers ──────────────────────────────────────────────────────

function computeTrendLine(data: HistogramRow[]) {
  if (data.length < 2) return data.map((d) => ({ ...d, trend: d.video_count }))
  const points: [number, number][] = data.map((d, i) => [i, d.video_count])
  const result = regression.polynomial(points, { order: 3 })
  return data.map((d, i) => ({
    ...d,
    trend: Math.max(0, Math.round(result.predict(i)[1] * 10) / 10),
  }))
}

function ViewsHistogramChart({
  title,
  data,
  color,
  trendColor,
}: {
  title: string
  data: HistogramRow[]
  color: string
  trendColor: string
}) {
  const [showBars, setShowBars] = useState(true)
  const trendData = useMemo(() => computeTrendLine(data), [data])
  const gradientId = `gradient-${trendColor.replace("#", "")}`

  return (
    <div className="rounded-lg border p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">{title}</h3>
        <button
          onClick={() => setShowBars((prev) => !prev)}
          className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          title={showBars ? "Show trend only" : "Show bars"}
        >
          {showBars ? (
            <TrendingUp className="size-3" />
          ) : (
            <BarChart3 className="size-3" />
          )}
          {showBars ? "Trend" : "Bars"}
        </button>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart
          data={trendData}
          margin={{ top: 5, right: 10, bottom: 5, left: 0 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={trendColor} stopOpacity={0.4} />
              <stop offset="100%" stopColor={trendColor} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            className="opacity-30"
            vertical={false}
          />
          <XAxis
            dataKey="bucket_label"
            tick={{ fontSize: 11, fontWeight: 600 }}
            interval={0}
            height={30}
          />
          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(v: number | undefined, name?: string) => [
              Number(v ?? 0).toLocaleString(),
              name === "trend" ? "Trend" : "Videos",
            ]}
            labelFormatter={(v) => `${v}`}
          />
          {showBars && (
            <Bar dataKey="video_count" fill={color} radius={[2, 2, 0, 0]} />
          )}
          {!showBars ? (
            <Area
              type="monotone"
              dataKey="trend"
              fill={`url(#${gradientId})`}
              stroke={trendColor}
              strokeWidth={3}
            />
          ) : (
            <Line
              type="monotone"
              dataKey="trend"
              stroke={trendColor}
              strokeWidth={3.5}
              dot={false}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Data shapes for charts ─────────────────────────────────────────────────

interface AvgViewsRow {
  name: string
  avgViewsShort: number
  avgViewsFull: number
}

interface ContentMixScatterRow {
  name: string
  shortRatio: number
  totalViews: number
  subscribers: number
  channelId: string
}

interface VideoScatterRow {
  name: string
  duration: number
  views: number
  channelId: string
  durationType: string
}

// ─── Custom scatter label renderer ──────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderScatterLabel(props: any) {
  const { x, y, value } = props
  return (
    <text
      x={Number(x ?? 0)}
      y={Number(y ?? 0) - 8}
      textAnchor="middle"
      fontSize={10}
      fill="currentColor"
      className="text-muted-foreground"
    >
      {String(value ?? "")}
    </text>
  )
}

// ─── Main component ─────────────────────────────────────────────────────────

export function ContentMixTab({ data }: { data: DashboardData }) {
  const { creators, videos, videoStats, histograms } = data
  const [durationFilter, setDurationFilter] = useState<
    "All" | "Short" | "Full"
  >("All")

  // ── 4.1 Short vs Full Avg Views ──────────────────────────────────────────
  const avgViewsData: AvgViewsRow[] = useMemo(() => {
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

  // ── 4.2 Content Mix vs Total Views ───────────────────────────────────────
  const contentMixScatter: ContentMixScatterRow[] = useMemo(() => {
    return creators
      .map((c) => {
        const creatorVideos = videos.filter(
          (v) => v.channelId === c.channelId
        )
        const totalVids = creatorVideos.length
        if (totalVids === 0) return null
        const shortCount = creatorVideos.filter(
          (v) => v.durationType === "Short"
        ).length
        const shortRatio = Math.round((shortCount / totalVids) * 100)
        return {
          name: c.title,
          shortRatio,
          totalViews: toNum(c.totalViews),
          subscribers: Math.max(toNum(c.subscribers), 1),
          channelId: c.channelId,
        }
      })
      .filter((r): r is ContentMixScatterRow => r !== null && r.totalViews > 0)
  }, [creators, videos])

  const maxSubscribers = useMemo(
    () => Math.max(...contentMixScatter.map((r) => r.subscribers), 1),
    [contentMixScatter]
  )

  // ── 4.3 Duration vs Views (individual videos) ───────────────────────────
  const videoScatterData: VideoScatterRow[] = useMemo(() => {
    return videos
      .filter((v) => {
        if (durationFilter === "Short") return v.durationType === "Short"
        if (durationFilter === "Full") return v.durationType !== "Short"
        return true
      })
      .map((v) => {
        const rawDuration = toNum(v.duration)
        // Shorts durations are in seconds, Full in minutes — normalize to minutes
        const durationMinutes =
          v.durationType === "Short" ? rawDuration / 60 : rawDuration
        const creator = creators.find((c) => c.channelId === v.channelId)
        return {
          name: creator?.title ?? "Unknown",
          duration: Math.round(durationMinutes * 100) / 100,
          views: toNum(v.views),
          channelId: v.channelId,
          durationType: v.durationType ?? "Full",
        }
      })
      .filter((r) => r.views > 0 && r.duration > 0)
  }, [videos, creators, durationFilter])

  // Build legend entries for creator colors (unique creators in filtered set)
  const creatorLegend = useMemo(() => {
    const seen = new Map<string, string>()
    for (const v of videoScatterData) {
      if (!seen.has(v.channelId)) {
        seen.set(v.channelId, v.name)
      }
    }
    return Array.from(seen.entries()).map(([channelId, name]) => ({
      channelId,
      name,
      color: getCreatorColor(channelId),
    }))
  }, [videoScatterData])

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Row 1: Charts 4.1 + 4.2 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 4.1 Short vs Full Avg Views */}
        <div className="rounded-lg border p-5">
          <h3 className="text-sm font-semibold mb-4">
            Short vs Full-Length — Avg Views
          </h3>
          <ResponsiveContainer
            width="100%"
            height={Math.max(avgViewsData.length * 32 + 40, 200)}
          >
            <BarChart
              data={avgViewsData}
              layout="vertical"
              margin={{ left: 120, right: 20, top: 5, bottom: 5 }}
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
                tickFormatter={(v: number) => formatNumber(v)}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11 }}
                width={115}
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
                radius={[0, 2, 2, 0]}
              />
              <Bar
                dataKey="avgViewsFull"
                fill="#38bdf8"
                radius={[0, 2, 2, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 4.2 Content Mix vs Total Views */}
        <div className="rounded-lg border p-5">
          <h3 className="text-sm font-semibold mb-4">
            Content Mix vs Total Views
          </h3>
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart
              margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                type="number"
                dataKey="shortRatio"
                name="Short %"
                domain={[0, 100]}
                tick={{ fontSize: 11 }}
                label={{
                  value: "Short Video Ratio (%)",
                  position: "insideBottom",
                  offset: -10,
                  fontSize: 11,
                }}
                unit="%"
              />
              <YAxis
                type="number"
                dataKey="totalViews"
                name="Total Views"
                tick={{ fontSize: 11 }}
                tickFormatter={(v: number) => formatNumber(v)}
                label={{
                  value: "Total Views",
                  angle: -90,
                  position: "insideLeft",
                  offset: 0,
                  fontSize: 11,
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
                  if (name === "Short %") return [`${value ?? 0}%`, name]
                  return [formatNumber(value ?? 0), name ?? ""]
                }}
                labelFormatter={(_label, payload) => {
                  if (payload && payload.length > 0) {
                    const row = payload[0].payload as ContentMixScatterRow
                    return row.name
                  }
                  return ""
                }}
              />
              <Scatter data={contentMixScatter} name="Creators">
                {contentMixScatter.map((entry) => (
                  <Cell
                    key={entry.channelId}
                    fill={getCreatorColor(entry.channelId)}
                    fillOpacity={0.75}
                  />
                ))}
                <LabelList
                  dataKey="name"
                  content={renderScatterLabel}
                />
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: Chart 4.3 Duration vs Views */}
      <div className="rounded-lg border p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">
            Duration vs Views — Individual Videos
          </h3>
          <div className="flex items-center gap-1">
            {(["All", "Short", "Full"] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setDurationFilter(opt)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  durationFilter === opt
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart
            margin={{ top: 10, right: 20, bottom: 20, left: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis
              type="number"
              dataKey="duration"
              name="Duration"
              tick={{ fontSize: 11 }}
              label={{
                value: "Duration (minutes)",
                position: "insideBottom",
                offset: -10,
                fontSize: 11,
              }}
            />
            <YAxis
              type="number"
              dataKey="views"
              name="Views"
              tick={{ fontSize: 11 }}
              tickFormatter={(v: number) => formatNumber(v)}
              label={{
                value: "Views",
                angle: -90,
                position: "insideLeft",
                offset: 0,
                fontSize: 11,
              }}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(value: number | undefined, name?: string) => {
                if (name === "Duration")
                  return [`${(value ?? 0).toFixed(1)} min`, name]
                return [formatNumber(value ?? 0), name ?? ""]
              }}
              labelFormatter={(_label, payload) => {
                if (payload && payload.length > 0) {
                  const row = payload[0].payload as VideoScatterRow
                  return `${row.name} (${row.durationType})`
                }
                return ""
              }}
            />
            <Scatter data={videoScatterData} name="Videos">
              {videoScatterData.map((entry, idx) => (
                <Cell
                  key={`${entry.channelId}-${idx}`}
                  fill={getCreatorColor(entry.channelId)}
                  fillOpacity={0.6}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
        {/* Creator color legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 px-2">
          {creatorLegend.map((c) => (
            <div key={c.channelId} className="flex items-center gap-1.5">
              <span
                className="inline-block size-2.5 rounded-full"
                style={{ backgroundColor: c.color }}
              />
              <span className="text-xs text-muted-foreground">{c.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Row 3: Chart 4.4 — 4 Histograms */}
      <div className="grid gap-6 md:grid-cols-2">
        <ViewsHistogramChart
          title="Short Videos — Views (thousands)"
          data={histograms.shortViews}
          color="#f472b6"
          trendColor="#a3e635"
        />
        <ViewsHistogramChart
          title="Full-Length Videos — Views (thousands)"
          data={histograms.fullViews}
          color="#38bdf8"
          trendColor="#c084fc"
        />
        <ViewsHistogramChart
          title="Short Videos — Duration (seconds)"
          data={histograms.shortDuration}
          color="#ec4899"
          trendColor="#facc15"
        />
        <ViewsHistogramChart
          title="Full-Length Videos — Duration (minutes)"
          data={histograms.fullDuration}
          color="#0ea5e9"
          trendColor="#f97316"
        />
      </div>
    </div>
  )
}
