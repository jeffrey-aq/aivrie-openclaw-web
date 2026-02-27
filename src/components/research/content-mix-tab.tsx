"use client"

import { useMemo, useState, useEffect, useRef } from "react"
import regression from "regression"
import { TrendingUp, BarChart3 } from "lucide-react"
import { scaleBand, scaleLinear, scaleSqrt } from "d3-scale"
import { axisBottom, axisLeft } from "d3-axis"
import { max, extent } from "d3-array"
import { line as d3line, area as d3area } from "d3-shape"
import { select } from "d3-selection"
import type {
  DashboardData,
  CreatorFull,
  VideoRow,
  VideoStats,
  HistogramRow,
} from "@/app/research/page"
import {
  getCreatorColor,
  formatNumber,
  toNum,
} from "@/components/research/chart-utils"
import { useChartDimensions } from "@/components/research/d3/use-chart-dimensions"
import { useD3Axis } from "@/components/research/d3/use-d3-axis"
import { ChartGrid } from "@/components/research/d3/grid"
import { ChartTooltip } from "@/components/research/d3/tooltip"
import { ChartLegend } from "@/components/research/d3/legend"

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

// ─── Custom axis hook that applies bold font-weight to ticks ────────────────

function useD3AxisBold<Domain extends import("d3-axis").AxisDomain>(
  axis: import("d3-axis").Axis<Domain> | null,
) {
  const ref = useRef<SVGGElement>(null)

  useEffect(() => {
    if (!ref.current || !axis) return
    const g = select(ref.current)
    g.call(axis)
    g.selectAll(".tick text")
      .attr("fill", "var(--color-muted-foreground)")
      .attr("font-size", "11px")
      .attr("font-weight", "600")
    g.selectAll(".tick line").attr("stroke", "var(--color-border)")
    g.select(".domain").attr("stroke", "var(--color-border)")
  }, [axis])

  return ref
}

// ─── Chart 4.4: Views Histogram (Bars + Polynomial Trend Line/Area) ─────────

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

  const margin = { top: 5, right: 10, bottom: 30, left: 50 }
  const HEIGHT = 280
  const [ref, dims] = useChartDimensions(margin)
  const [tooltip, setTooltip] = useState<{
    x: number
    y: number
    row: (typeof trendData)[0]
  } | null>(null)

  const xScale = useMemo(
    () =>
      scaleBand<string>()
        .domain(trendData.map((d) => d.bucket_label))
        .range([0, dims.innerWidth])
        .padding(0.15),
    [trendData, dims.innerWidth],
  )

  const maxVal = useMemo(
    () =>
      max(trendData.flatMap((d) => [d.video_count, d.trend])) ?? 0,
    [trendData],
  )

  const yScale = useMemo(
    () =>
      scaleLinear()
        .domain([0, maxVal])
        .nice()
        .range([dims.innerHeight, 0]),
    [maxVal, dims.innerHeight],
  )

  const xAxis = useMemo(
    () =>
      dims.innerWidth > 0
        ? axisBottom(xScale).tickSizeOuter(0)
        : null,
    [xScale, dims.innerWidth],
  )
  const yAxis = useMemo(
    () =>
      dims.innerHeight > 0
        ? axisLeft(yScale).ticks(5).tickFormat((d) => `${d}`)
        : null,
    [yScale, dims.innerHeight],
  )

  const xAxisRef = useD3AxisBold(xAxis)
  const yAxisRef = useD3Axis(yAxis)

  const lineGen = useMemo(
    () =>
      d3line<(typeof trendData)[0]>()
        .x((d) => (xScale(d.bucket_label) ?? 0) + xScale.bandwidth() / 2)
        .y((d) => yScale(d.trend)),
    [xScale, yScale],
  )

  const areaGen = useMemo(
    () =>
      d3area<(typeof trendData)[0]>()
        .x((d) => (xScale(d.bucket_label) ?? 0) + xScale.bandwidth() / 2)
        .y0(dims.innerHeight)
        .y1((d) => yScale(d.trend)),
    [xScale, yScale, dims.innerHeight],
  )

  const handleMouse = (
    e: React.MouseEvent,
    row: (typeof trendData)[0],
  ) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, row })
  }

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
      <div ref={ref} className="relative w-full" style={{ height: HEIGHT }}>
        {dims.width > 0 && (
          <>
            <svg width={dims.width} height={HEIGHT}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={trendColor} stopOpacity={0.4} />
                  <stop
                    offset="100%"
                    stopColor={trendColor}
                    stopOpacity={0.02}
                  />
                </linearGradient>
              </defs>
              <g transform={`translate(${margin.left},${margin.top})`}>
                <ChartGrid
                  innerWidth={dims.innerWidth}
                  innerHeight={dims.innerHeight}
                  yTicks={yScale.ticks().map((t) => yScale(t))}
                  vertical={false}
                />
                {showBars &&
                  trendData.map((d) => (
                    <rect
                      key={d.bucket_label}
                      x={xScale(d.bucket_label) ?? 0}
                      y={yScale(d.video_count)}
                      width={xScale.bandwidth()}
                      height={Math.max(
                        0,
                        dims.innerHeight - yScale(d.video_count),
                      )}
                      fill={color}
                      rx={2}
                      onMouseMove={(e) => handleMouse(e, d)}
                      onMouseLeave={() => setTooltip(null)}
                    />
                  ))}
                {showBars ? (
                  <path
                    d={lineGen(trendData) ?? ""}
                    fill="none"
                    stroke={trendColor}
                    strokeWidth={3.5}
                  />
                ) : (
                  <>
                    <path
                      d={areaGen(trendData) ?? ""}
                      fill={`url(#${gradientId})`}
                      stroke={trendColor}
                      strokeWidth={3}
                    />
                    {/* Invisible wider hit areas for tooltips when bars hidden */}
                    {trendData.map((d) => (
                      <rect
                        key={d.bucket_label}
                        x={xScale(d.bucket_label) ?? 0}
                        y={0}
                        width={xScale.bandwidth()}
                        height={dims.innerHeight}
                        fill="transparent"
                        onMouseMove={(e) => handleMouse(e, d)}
                        onMouseLeave={() => setTooltip(null)}
                      />
                    ))}
                  </>
                )}
                <g
                  ref={xAxisRef}
                  transform={`translate(0,${dims.innerHeight})`}
                />
                <g ref={yAxisRef} />
              </g>
            </svg>
            <ChartTooltip
              x={tooltip?.x ?? 0}
              y={tooltip?.y ?? 0}
              visible={tooltip !== null}
              containerWidth={dims.width}
              containerHeight={HEIGHT}
            >
              {tooltip && (
                <>
                  <p className="font-medium text-xs mb-1">
                    {tooltip.row.bucket_label}
                  </p>
                  <p className="text-xs">
                    Videos: {tooltip.row.video_count.toLocaleString()}
                  </p>
                  <p className="text-xs">
                    Trend: {tooltip.row.trend.toLocaleString()}
                  </p>
                </>
              )}
            </ChartTooltip>
          </>
        )}
      </div>
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

// ─── Chart 4.1: Short vs Full Avg Views (Horizontal Grouped Bar) ────────────

const AVG_VIEWS_SERIES = [
  { key: "avgViewsShort" as const, label: "Short", color: "#ec4899" },
  { key: "avgViewsFull" as const, label: "Full-Length", color: "#38bdf8" },
]

function AvgViewsHorizChart({
  data,
  height,
}: {
  data: AvgViewsRow[]
  height: number
}) {
  const margin = { top: 5, right: 20, bottom: 30, left: 120 }
  const [ref, dims] = useChartDimensions(margin)
  const [tooltip, setTooltip] = useState<{
    x: number
    y: number
    row: AvgViewsRow
  } | null>(null)

  const yScale = useMemo(
    () =>
      scaleBand<string>()
        .domain(data.map((d) => d.name))
        .range([0, dims.innerHeight])
        .padding(0.2),
    [data, dims.innerHeight],
  )

  const yInner = useMemo(
    () =>
      scaleBand<string>()
        .domain(AVG_VIEWS_SERIES.map((s) => s.key))
        .range([0, yScale.bandwidth()])
        .padding(0.05),
    [yScale],
  )

  const maxVal = useMemo(
    () => max(data.flatMap((d) => [d.avgViewsShort, d.avgViewsFull])) ?? 0,
    [data],
  )

  const xScale = useMemo(
    () =>
      scaleLinear()
        .domain([0, maxVal])
        .nice()
        .range([0, dims.innerWidth]),
    [maxVal, dims.innerWidth],
  )

  const xAxis = useMemo(
    () =>
      dims.innerWidth > 0
        ? axisBottom(xScale).tickFormat((d) => formatNumber(Number(d)))
        : null,
    [xScale, dims.innerWidth],
  )
  const yAxis = useMemo(
    () => (dims.innerHeight > 0 ? axisLeft(yScale) : null),
    [yScale, dims.innerHeight],
  )

  const xAxisRef = useD3Axis(xAxis)
  const yAxisRef = useD3Axis(yAxis)

  const handleMouse = (e: React.MouseEvent, row: AvgViewsRow) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, row })
  }

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {dims.width > 0 && (
        <>
          <svg width={dims.width} height={height}>
            <g transform={`translate(${margin.left},${margin.top})`}>
              <ChartGrid
                innerWidth={dims.innerWidth}
                innerHeight={dims.innerHeight}
                xTicks={xScale.ticks().map((t) => xScale(t))}
                horizontal={false}
              />
              {data.map((d) => (
                <g
                  key={d.name}
                  transform={`translate(0,${yScale(d.name) ?? 0})`}
                >
                  {AVG_VIEWS_SERIES.map((s) => {
                    const val = d[s.key]
                    return (
                      <rect
                        key={s.key}
                        x={0}
                        y={yInner(s.key) ?? 0}
                        width={Math.max(0, xScale(val))}
                        height={yInner.bandwidth()}
                        fill={s.color}
                        rx={2}
                        onMouseMove={(e) => handleMouse(e, d)}
                        onMouseLeave={() => setTooltip(null)}
                      />
                    )
                  })}
                </g>
              ))}
              <g
                ref={xAxisRef}
                transform={`translate(0,${dims.innerHeight})`}
              />
              <g ref={yAxisRef} />
            </g>
          </svg>
          <ChartTooltip
            x={tooltip?.x ?? 0}
            y={tooltip?.y ?? 0}
            visible={tooltip !== null}
            containerWidth={dims.width}
            containerHeight={height}
          >
            {tooltip && (
              <>
                <p className="font-medium text-xs mb-1">{tooltip.row.name}</p>
                <p className="text-xs">
                  Avg Short: {formatNumber(tooltip.row.avgViewsShort)}
                </p>
                <p className="text-xs">
                  Avg Full: {formatNumber(tooltip.row.avgViewsFull)}
                </p>
              </>
            )}
          </ChartTooltip>
        </>
      )}
    </div>
  )
}

// ─── Chart 4.2: Content Mix vs Total Views (Bubble Scatter) ─────────────────

function ContentMixScatter({ data }: { data: ContentMixScatterRow[] }) {
  const margin = { top: 20, right: 20, bottom: 45, left: 70 }
  const HEIGHT = 400
  const [ref, dims] = useChartDimensions(margin)
  const [tooltip, setTooltip] = useState<{
    x: number
    y: number
    row: ContentMixScatterRow
  } | null>(null)

  const maxSubs = useMemo(() => max(data, (d) => d.subscribers) ?? 1, [data])

  const xScale = useMemo(
    () => scaleLinear().domain([0, 100]).range([0, dims.innerWidth]),
    [dims.innerWidth],
  )

  const yExt = useMemo(
    () => extent(data, (d) => d.totalViews) as [number, number],
    [data],
  )

  const yScale = useMemo(
    () =>
      scaleLinear()
        .domain([0, yExt[1] ?? 1])
        .nice()
        .range([dims.innerHeight, 0]),
    [yExt, dims.innerHeight],
  )

  const rScale = useMemo(
    () => scaleSqrt().domain([0, maxSubs]).range([6, 24]),
    [maxSubs],
  )

  const xAxis = useMemo(
    () =>
      dims.innerWidth > 0
        ? axisBottom(xScale).tickFormat((d) => `${d}%`)
        : null,
    [xScale, dims.innerWidth],
  )
  const yAxis = useMemo(
    () =>
      dims.innerHeight > 0
        ? axisLeft(yScale).tickFormat((d) => formatNumber(Number(d)))
        : null,
    [yScale, dims.innerHeight],
  )

  const xAxisRef = useD3Axis(xAxis)
  const yAxisRef = useD3Axis(yAxis)

  const handleMouse = (e: React.MouseEvent, row: ContentMixScatterRow) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, row })
  }

  return (
    <div ref={ref} className="relative w-full" style={{ height: HEIGHT }}>
      {dims.width > 0 && (
        <>
          <svg width={dims.width} height={HEIGHT}>
            <g transform={`translate(${margin.left},${margin.top})`}>
              <ChartGrid
                innerWidth={dims.innerWidth}
                innerHeight={dims.innerHeight}
                xTicks={xScale.ticks().map((t) => xScale(t))}
                yTicks={yScale.ticks().map((t) => yScale(t))}
              />
              {data.map((d) => {
                const r = rScale(d.subscribers)
                const creatorColor = getCreatorColor(d.channelId)
                return (
                  <g key={d.channelId}>
                    <circle
                      cx={xScale(d.shortRatio)}
                      cy={yScale(d.totalViews)}
                      r={r}
                      fill={creatorColor}
                      fillOpacity={0.75}
                      stroke={creatorColor}
                      strokeWidth={1}
                      onMouseMove={(e) => handleMouse(e, d)}
                      onMouseLeave={() => setTooltip(null)}
                    />
                    <text
                      x={xScale(d.shortRatio)}
                      y={yScale(d.totalViews) - r - 4}
                      textAnchor="middle"
                      fontSize={9}
                      fill="var(--color-muted-foreground)"
                    >
                      {d.name}
                    </text>
                  </g>
                )
              })}
              <g
                ref={xAxisRef}
                transform={`translate(0,${dims.innerHeight})`}
              />
              <g ref={yAxisRef} />
              <text
                x={dims.innerWidth / 2}
                y={dims.innerHeight + margin.bottom - 5}
                textAnchor="middle"
                fontSize={11}
                fill="var(--color-muted-foreground)"
              >
                Short Video Ratio (%)
              </text>
              <text
                transform="rotate(-90)"
                x={-dims.innerHeight / 2}
                y={-margin.left + 15}
                textAnchor="middle"
                fontSize={11}
                fill="var(--color-muted-foreground)"
              >
                Total Views
              </text>
            </g>
          </svg>
          <ChartTooltip
            x={tooltip?.x ?? 0}
            y={tooltip?.y ?? 0}
            visible={tooltip !== null}
            containerWidth={dims.width}
            containerHeight={HEIGHT}
          >
            {tooltip && (
              <>
                <p className="font-medium text-xs mb-1">{tooltip.row.name}</p>
                <p className="text-xs">
                  Short Ratio: {tooltip.row.shortRatio}%
                </p>
                <p className="text-xs">
                  Total Views: {formatNumber(tooltip.row.totalViews)}
                </p>
                <p className="text-xs">
                  Subscribers: {formatNumber(tooltip.row.subscribers)}
                </p>
              </>
            )}
          </ChartTooltip>
        </>
      )}
    </div>
  )
}

// ─── Chart 4.3: Duration vs Views (Scatter with filter toggle) ──────────────

function DurationViewsScatter({ data }: { data: VideoScatterRow[] }) {
  const margin = { top: 10, right: 20, bottom: 45, left: 70 }
  const HEIGHT = 400
  const [ref, dims] = useChartDimensions(margin)
  const [tooltip, setTooltip] = useState<{
    x: number
    y: number
    row: VideoScatterRow
  } | null>(null)

  const xExt = useMemo(
    () => extent(data, (d) => d.duration) as [number, number],
    [data],
  )
  const yExt = useMemo(
    () => extent(data, (d) => d.views) as [number, number],
    [data],
  )

  const xScale = useMemo(
    () =>
      scaleLinear()
        .domain([Math.max(xExt[0] ?? 0, 0), xExt[1] ?? 1])
        .nice()
        .range([0, dims.innerWidth]),
    [xExt, dims.innerWidth],
  )
  const yScale = useMemo(
    () =>
      scaleLinear()
        .domain([0, yExt[1] ?? 1])
        .nice()
        .range([dims.innerHeight, 0]),
    [yExt, dims.innerHeight],
  )

  const xAxis = useMemo(
    () => (dims.innerWidth > 0 ? axisBottom(xScale) : null),
    [xScale, dims.innerWidth],
  )
  const yAxis = useMemo(
    () =>
      dims.innerHeight > 0
        ? axisLeft(yScale).tickFormat((d) => formatNumber(Number(d)))
        : null,
    [yScale, dims.innerHeight],
  )

  const xAxisRef = useD3Axis(xAxis)
  const yAxisRef = useD3Axis(yAxis)

  const handleMouse = (e: React.MouseEvent, row: VideoScatterRow) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, row })
  }

  return (
    <div ref={ref} className="relative w-full" style={{ height: HEIGHT }}>
      {dims.width > 0 && (
        <>
          <svg width={dims.width} height={HEIGHT}>
            <g transform={`translate(${margin.left},${margin.top})`}>
              <ChartGrid
                innerWidth={dims.innerWidth}
                innerHeight={dims.innerHeight}
                xTicks={xScale.ticks().map((t) => xScale(t))}
                yTicks={yScale.ticks().map((t) => yScale(t))}
              />
              {data.map((d, i) => (
                <circle
                  key={`${d.channelId}-${i}`}
                  cx={xScale(d.duration)}
                  cy={yScale(d.views)}
                  r={4}
                  fill={getCreatorColor(d.channelId)}
                  fillOpacity={0.6}
                  stroke={getCreatorColor(d.channelId)}
                  strokeWidth={0.5}
                  onMouseMove={(e) => handleMouse(e, d)}
                  onMouseLeave={() => setTooltip(null)}
                />
              ))}
              <g
                ref={xAxisRef}
                transform={`translate(0,${dims.innerHeight})`}
              />
              <g ref={yAxisRef} />
              <text
                x={dims.innerWidth / 2}
                y={dims.innerHeight + margin.bottom - 5}
                textAnchor="middle"
                fontSize={11}
                fill="var(--color-muted-foreground)"
              >
                Duration (minutes)
              </text>
              <text
                transform="rotate(-90)"
                x={-dims.innerHeight / 2}
                y={-margin.left + 15}
                textAnchor="middle"
                fontSize={11}
                fill="var(--color-muted-foreground)"
              >
                Views
              </text>
            </g>
          </svg>
          <ChartTooltip
            x={tooltip?.x ?? 0}
            y={tooltip?.y ?? 0}
            visible={tooltip !== null}
            containerWidth={dims.width}
            containerHeight={HEIGHT}
          >
            {tooltip && (
              <>
                <p className="font-medium text-xs mb-1">
                  {tooltip.row.name} ({tooltip.row.durationType})
                </p>
                <p className="text-xs">
                  Duration: {tooltip.row.duration.toFixed(1)} min
                </p>
                <p className="text-xs">
                  Views: {formatNumber(tooltip.row.views)}
                </p>
              </>
            )}
          </ChartTooltip>
        </>
      )}
    </div>
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
          <AvgViewsHorizChart
            data={avgViewsData}
            height={Math.max(avgViewsData.length * 32 + 40, 200)}
          />
          <ChartLegend
            entries={AVG_VIEWS_SERIES.map((s) => ({
              label: s.label,
              color: s.color,
            }))}
            className="mt-2"
          />
        </div>

        {/* 4.2 Content Mix vs Total Views */}
        <div className="rounded-lg border p-5">
          <h3 className="text-sm font-semibold mb-4">
            Content Mix vs Total Views
          </h3>
          <ContentMixScatter data={contentMixScatter} />
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
        <DurationViewsScatter data={videoScatterData} />
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
