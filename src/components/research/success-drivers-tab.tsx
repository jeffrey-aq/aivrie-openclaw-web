"use client"

import { useMemo, useState } from "react"
import { scaleBand, scaleLinear, scaleLog, scaleSqrt } from "d3-scale"
import { axisBottom, axisLeft, axisRight } from "d3-axis"
import { max, extent } from "d3-array"
import { line as d3line } from "d3-shape"
import regression from "regression"

import type { DashboardData } from "@/app/research/page"

import {
  percentile,
  NICHE_COLORS,
  getCreatorColor,
  formatNumber,
  toNum,
} from "@/components/research/chart-utils"
import { useChartDimensions } from "@/components/research/d3/use-chart-dimensions"
import { useD3Axis } from "@/components/research/d3/use-d3-axis"
import { ChartGrid } from "@/components/research/d3/grid"
import { ChartTooltip } from "@/components/research/d3/tooltip"
import { ChartLegend } from "@/components/research/d3/legend"

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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  engagementPct: number | null
}

// ─── Chart 1.0: Short vs Full Avg Views (Vertical Grouped Bar) ─────────────

const AVG_VIEWS_SERIES = [
  { key: "avgViewsShort" as const, label: "Short", color: "#ec4899" },
  { key: "avgViewsFull" as const, label: "Full-Length", color: "#38bdf8" },
]

type ScaleMode = "linear" | "log2" | "log10"
const SCALE_OPTIONS: { value: ScaleMode; label: string }[] = [
  { value: "linear", label: "Linear" },
  { value: "log2", label: "Log₂" },
  { value: "log10", label: "Log₁₀" },
]

const ENGAGEMENT_COLOR = "#f59e0b"

function AvgViewsChart({ data }: { data: AvgViewsRow[] }) {
  const margin = { top: 10, right: 55, bottom: 100, left: 70 }
  const HEIGHT = 400
  const [ref, dims] = useChartDimensions(margin)
  const [scaleMode, setScaleMode] = useState<ScaleMode>("linear")
  const [tooltip, setTooltip] = useState<{
    x: number
    y: number
    row: AvgViewsRow
  } | null>(null)

  const xScale = useMemo(
    () =>
      scaleBand<string>()
        .domain(data.map((d) => d.name))
        .range([0, dims.innerWidth])
        .padding(0.2),
    [data, dims.innerWidth],
  )

  const xInner = useMemo(
    () =>
      scaleBand<string>()
        .domain(AVG_VIEWS_SERIES.map((s) => s.key))
        .range([0, xScale.bandwidth()])
        .padding(0.05),
    [xScale],
  )

  const maxVal = useMemo(
    () =>
      max(data.flatMap((d) => [d.avgViewsShort, d.avgViewsFull])) ?? 0,
    [data],
  )

  const yScale = useMemo(() => {
    if (scaleMode === "linear") {
      return scaleLinear()
        .domain([0, maxVal])
        .nice()
        .range([dims.innerHeight, 0])
    }
    const base = scaleMode === "log2" ? 2 : 10
    return scaleLog()
      .base(base)
      .domain([1, Math.max(maxVal, 2)])
      .nice()
      .range([dims.innerHeight, 0])
      .clamp(true)
  }, [scaleMode, maxVal, dims.innerHeight])

  // Right Y-axis for engagement %
  const maxEngagement = useMemo(
    () => max(data, (d) => d.engagementPct ?? 0) ?? 10,
    [data],
  )
  const yRightScale = useMemo(
    () =>
      scaleLinear()
        .domain([0, maxEngagement])
        .nice()
        .range([dims.innerHeight, 0]),
    [maxEngagement, dims.innerHeight],
  )

  const yAxis = useMemo(
    () =>
      dims.innerHeight > 0
        ? axisLeft(yScale).tickFormat((d) => formatNumber(Number(d)))
        : null,
    [yScale, dims.innerHeight],
  )
  const yRightAxis = useMemo(
    () =>
      dims.innerHeight > 0
        ? axisRight(yRightScale).ticks(5).tickFormat((d) => `${Number(d).toFixed(1)}%`)
        : null,
    [yRightScale, dims.innerHeight],
  )

  const yAxisRef = useD3Axis(yAxis)
  const yRightAxisRef = useD3Axis(yRightAxis)

  // Engagement line path
  const engagementLine = useMemo(() => {
    const lineGen = d3line<AvgViewsRow>()
      .defined((d) => d.engagementPct != null)
      .x((d) => (xScale(d.name) ?? 0) + xScale.bandwidth() / 2)
      .y((d) => yRightScale(d.engagementPct ?? 0))
    return lineGen(data) ?? ""
  }, [data, xScale, yRightScale])

  const handleMouse = (e: React.MouseEvent, row: AvgViewsRow) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setTooltip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      row,
    })
  }

  // For log scales, clamp values below 1 to 1 so bars start from the bottom
  const yPos = (val: number) => yScale(scaleMode === "linear" ? val : Math.max(val, 1))
  const barBase = scaleMode === "linear" ? dims.innerHeight : yScale(1)

  return (
    <div ref={ref} className="relative w-full" style={{ height: HEIGHT }}>
      {/* Scale mode dropdown */}
      <div className="absolute top-0 right-0 z-10">
        <select
          value={scaleMode}
          onChange={(e) => setScaleMode(e.target.value as ScaleMode)}
          className="rounded border bg-background px-2 py-1 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {SCALE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      {dims.width > 0 && (
        <>
          <svg width={dims.width} height={HEIGHT}>
            <g transform={`translate(${margin.left},${margin.top})`}>
              <ChartGrid
                innerWidth={dims.innerWidth}
                innerHeight={dims.innerHeight}
                yTicks={yScale.ticks().map((t) => yScale(t))}
                vertical={false}
              />
              {/* Bars */}
              {data.map((d) => (
                <g
                  key={d.name}
                  transform={`translate(${xScale(d.name) ?? 0},0)`}
                >
                  {AVG_VIEWS_SERIES.map((s) => {
                    const val = d[s.key]
                    const top = yPos(val)
                    const h = Math.max(0, barBase - top)
                    return (
                      <rect
                        key={s.key}
                        x={xInner(s.key) ?? 0}
                        y={top}
                        width={xInner.bandwidth()}
                        height={h}
                        fill={s.color}
                        rx={2}
                        onMouseMove={(e) => handleMouse(e, d)}
                        onMouseLeave={() => setTooltip(null)}
                      />
                    )
                  })}
                </g>
              ))}
              {/* Engagement % line overlay */}
              <path
                d={engagementLine}
                fill="none"
                stroke={ENGAGEMENT_COLOR}
                strokeWidth={2}
                strokeLinejoin="round"
              />
              {/* Engagement dots */}
              {data.map((d) =>
                d.engagementPct != null ? (
                  <circle
                    key={`eng-${d.name}`}
                    cx={(xScale(d.name) ?? 0) + xScale.bandwidth() / 2}
                    cy={yRightScale(d.engagementPct)}
                    r={3.5}
                    fill={ENGAGEMENT_COLOR}
                    stroke="var(--color-background)"
                    strokeWidth={1.5}
                    onMouseMove={(e) => handleMouse(e, d)}
                    onMouseLeave={() => setTooltip(null)}
                  />
                ) : null,
              )}
              {/* Custom rotated X axis tick labels */}
              {data.map((d) => (
                <text
                  key={d.name}
                  x={xScale(d.name)! + xScale.bandwidth() / 2}
                  y={dims.innerHeight + 4}
                  textAnchor="end"
                  fontSize={10}
                  fill="var(--color-muted-foreground)"
                  transform={`rotate(-90, ${xScale(d.name)! + xScale.bandwidth() / 2}, ${dims.innerHeight + 4})`}
                >
                  {d.name}
                </text>
              ))}
              <g ref={yAxisRef} />
              <g ref={yRightAxisRef} transform={`translate(${dims.innerWidth},0)`} />
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
                  {tooltip.row.name}
                </p>
                <p className="text-xs">
                  Avg Short: {formatNumber(tooltip.row.avgViewsShort)}
                </p>
                <p className="text-xs">
                  Avg Full: {formatNumber(tooltip.row.avgViewsFull)}
                </p>
                {tooltip.row.engagementPct != null && (
                  <p className="text-xs" style={{ color: ENGAGEMENT_COLOR }}>
                    Engagement: {tooltip.row.engagementPct.toFixed(2)}%
                  </p>
                )}
              </>
            )}
          </ChartTooltip>
        </>
      )}
    </div>
  )
}

// ─── Chart 1.1: Subscribers vs Engagement (Bubble Scatter, Log X) ───────────

function EngagementScatterChart({
  data,
}: {
  data: EngagementScatterRow[]
}) {
  const margin = { top: 10, right: 20, bottom: 45, left: 70 }
  const HEIGHT = 400
  const [ref, dims] = useChartDimensions(margin)
  const [tooltip, setTooltip] = useState<{
    x: number
    y: number
    row: EngagementScatterRow
  } | null>(null)

  const xExt = useMemo(() => {
    const ext = extent(data, (d) => d.subscribers) as [number, number]
    return [Math.max(ext[0] ?? 1, 1), ext[1] ?? 1] as [number, number]
  }, [data])

  const yExt = useMemo(
    () => extent(data, (d) => d.avgEngagement) as [number, number],
    [data],
  )

  const maxViews = useMemo(() => max(data, (d) => d.totalViews) ?? 1, [data])

  const xScale = useMemo(
    () =>
      scaleLog()
        .domain(xExt)
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

  const rScale = useMemo(
    () => scaleSqrt().domain([0, maxViews]).range([4, 20]),
    [maxViews],
  )

  const xAxis = useMemo(
    () =>
      dims.innerWidth > 0
        ? axisBottom(xScale).tickFormat((d) => formatNumber(Number(d)))
        : null,
    [xScale, dims.innerWidth],
  )
  const yAxis = useMemo(
    () =>
      dims.innerHeight > 0
        ? axisLeft(yScale).tickFormat((d) => `${Number(d).toFixed(1)}%`)
        : null,
    [yScale, dims.innerHeight],
  )

  const xAxisRef = useD3Axis(xAxis)
  const yAxisRef = useD3Axis(yAxis)

  const handleMouse = (e: React.MouseEvent, row: EngagementScatterRow) => {
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
              {data.map((d, i) => {
                const r = rScale(d.totalViews)
                return (
                  <g key={i}>
                    <circle
                      cx={xScale(d.subscribers)}
                      cy={yScale(d.avgEngagement)}
                      r={r}
                      fill={d.color}
                      fillOpacity={0.7}
                      stroke={d.color}
                      strokeWidth={1}
                      onMouseMove={(e) => handleMouse(e, d)}
                      onMouseLeave={() => setTooltip(null)}
                    />
                    <text
                      x={xScale(d.subscribers)}
                      y={yScale(d.avgEngagement) - r - 4}
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
                Subscribers
              </text>
              <text
                transform="rotate(-90)"
                x={-dims.innerHeight / 2}
                y={-margin.left + 15}
                textAnchor="middle"
                fontSize={11}
                fill="var(--color-muted-foreground)"
              >
                Avg Engagement %
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
                  Subscribers: {formatNumber(tooltip.row.subscribers)}
                </p>
                <p className="text-xs">
                  Engagement: {tooltip.row.avgEngagement.toFixed(2)}%
                </p>
                <p className="text-xs">
                  Total Views: {formatNumber(tooltip.row.totalViews)}
                </p>
                <p className="text-xs">Niche: {tooltip.row.niche}</p>
              </>
            )}
          </ChartTooltip>
        </>
      )}
    </div>
  )
}

// ─── Chart 1.2: Views-to-Sub Ratio (Scatter, Log X) ────────────────────────

function ViewsSubRatioChart({
  data,
}: {
  data: ViewsSubRatioRow[]
}) {
  const margin = { top: 10, right: 20, bottom: 45, left: 70 }
  const HEIGHT = 400
  const [ref, dims] = useChartDimensions(margin)
  const [tooltip, setTooltip] = useState<{
    x: number
    y: number
    row: ViewsSubRatioRow
  } | null>(null)

  const xExt = useMemo(() => {
    const ext = extent(data, (d) => d.avgViewsPerVideo) as [number, number]
    return [Math.max(ext[0] ?? 1, 1), ext[1] ?? 1] as [number, number]
  }, [data])

  const yExt = useMemo(
    () => extent(data, (d) => d.viewsToSubRatio) as [number, number],
    [data],
  )

  const xScale = useMemo(
    () =>
      scaleLog()
        .domain(xExt)
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
    () =>
      dims.innerWidth > 0
        ? axisBottom(xScale).tickFormat((d) => formatNumber(Number(d)))
        : null,
    [xScale, dims.innerWidth],
  )
  const yAxis = useMemo(
    () =>
      dims.innerHeight > 0
        ? axisLeft(yScale).tickFormat((d) => `${Number(d).toFixed(0)}%`)
        : null,
    [yScale, dims.innerHeight],
  )

  const xAxisRef = useD3Axis(xAxis)
  const yAxisRef = useD3Axis(yAxis)

  const handleMouse = (e: React.MouseEvent, row: ViewsSubRatioRow) => {
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
                <g key={i}>
                  <circle
                    cx={xScale(d.avgViewsPerVideo)}
                    cy={yScale(d.viewsToSubRatio)}
                    r={5}
                    fill={d.color}
                    fillOpacity={0.7}
                    stroke={d.color}
                    strokeWidth={1}
                    onMouseMove={(e) => handleMouse(e, d)}
                    onMouseLeave={() => setTooltip(null)}
                  />
                  <text
                    x={xScale(d.avgViewsPerVideo)}
                    y={yScale(d.viewsToSubRatio) - 9}
                    textAnchor="middle"
                    fontSize={9}
                    fill="var(--color-muted-foreground)"
                  >
                    {d.name}
                  </text>
                </g>
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
                Avg Views per Video
              </text>
              <text
                transform="rotate(-90)"
                x={-dims.innerHeight / 2}
                y={-margin.left + 15}
                textAnchor="middle"
                fontSize={11}
                fill="var(--color-muted-foreground)"
              >
                Views:Sub Ratio %
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
                  Avg Views/Video: {formatNumber(tooltip.row.avgViewsPerVideo)}
                </p>
                <p className="text-xs">
                  Views:Sub Ratio: {tooltip.row.viewsToSubRatio.toFixed(1)}%
                </p>
                <p className="text-xs">Status: {tooltip.row.status}</p>
              </>
            )}
          </ChartTooltip>
        </>
      )}
    </div>
  )
}

// ─── Chart 1.3: Subscribers vs Total Views (Dual Log Scatter + Regression) ──

function RegressionChart({
  data,
  regressionLine,
}: {
  data: SubsViewsRow[]
  regressionLine: RegressionLinePoint[]
}) {
  const margin = { top: 10, right: 20, bottom: 45, left: 70 }
  const HEIGHT = 450
  const [ref, dims] = useChartDimensions(margin)
  const [tooltip, setTooltip] = useState<{
    x: number
    y: number
    row: SubsViewsRow | null
    isRegression: boolean
  } | null>(null)

  const xExt = useMemo(() => {
    const ext = extent(data, (d) => d.totalViews) as [number, number]
    return [Math.max(ext[0] ?? 1, 1), ext[1] ?? 1] as [number, number]
  }, [data])

  const yExt = useMemo(() => {
    const ext = extent(data, (d) => d.subscribers) as [number, number]
    return [Math.max(ext[0] ?? 1, 1), ext[1] ?? 1] as [number, number]
  }, [data])

  const xScale = useMemo(
    () =>
      scaleLog()
        .domain(xExt)
        .nice()
        .range([0, dims.innerWidth]),
    [xExt, dims.innerWidth],
  )

  const yScale = useMemo(
    () =>
      scaleLog()
        .domain(yExt)
        .nice()
        .range([dims.innerHeight, 0]),
    [yExt, dims.innerHeight],
  )

  const xAxis = useMemo(
    () =>
      dims.innerWidth > 0
        ? axisBottom(xScale).tickFormat((d) => formatNumber(Number(d)))
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

  const lineGen = useMemo(
    () =>
      d3line<RegressionLinePoint>()
        .x((d) => xScale(d.totalViews))
        .y((d) => yScale(d.subscribers)),
    [xScale, yScale],
  )

  const handleMouse = (e: React.MouseEvent, row: SubsViewsRow) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setTooltip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      row,
      isRegression: false,
    })
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
              {/* Regression line */}
              {regressionLine.length > 0 && (
                <path
                  d={lineGen(regressionLine) ?? ""}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="6 3"
                />
              )}
              {/* Scatter points */}
              {data.map((d, i) => (
                <g key={i}>
                  <circle
                    cx={xScale(d.totalViews)}
                    cy={yScale(d.subscribers)}
                    r={6}
                    fill={d.color}
                    fillOpacity={0.7}
                    stroke={d.color}
                    strokeWidth={1}
                    onMouseMove={(e) => handleMouse(e, d)}
                    onMouseLeave={() => setTooltip(null)}
                  />
                  <text
                    x={xScale(d.totalViews)}
                    y={yScale(d.subscribers) - 10}
                    textAnchor="middle"
                    fontSize={9}
                    fill="var(--color-muted-foreground)"
                  >
                    {d.name}
                  </text>
                </g>
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
                Total Views
              </text>
              <text
                transform="rotate(-90)"
                x={-dims.innerHeight / 2}
                y={-margin.left + 15}
                textAnchor="middle"
                fontSize={11}
                fill="var(--color-muted-foreground)"
              >
                Subscribers
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
            {tooltip && tooltip.row && (
              <>
                <p className="font-medium text-xs mb-1">
                  {tooltip.row.name}
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

// ─── Chart 1.4: Success Score Ranking (Horizontal Stacked Bar) ──────────────

function ScoreRankingChart({ data }: { data: ScoreRow[] }) {
  const height = Math.max(data.length * 32 + 60, 250)
  const margin = { top: 5, right: 30, bottom: 30, left: 120 }
  const [ref, dims] = useChartDimensions(margin)
  const [tooltip, setTooltip] = useState<{
    x: number
    y: number
    row: ScoreRow
  } | null>(null)

  const yScale = useMemo(
    () =>
      scaleBand<string>()
        .domain(data.map((d) => d.name))
        .range([0, dims.innerHeight])
        .padding(0.2),
    [data, dims.innerHeight],
  )

  const xScale = useMemo(
    () =>
      scaleLinear()
        .domain([0, 100])
        .range([0, dims.innerWidth]),
    [dims.innerWidth],
  )

  const xAxis = useMemo(
    () =>
      dims.innerWidth > 0
        ? axisBottom(xScale).tickFormat((d) => `${Number(d)}`)
        : null,
    [xScale, dims.innerWidth],
  )
  const yAxis = useMemo(
    () => (dims.innerHeight > 0 ? axisLeft(yScale) : null),
    [yScale, dims.innerHeight],
  )

  const xAxisRef = useD3Axis(xAxis)
  const yAxisRef = useD3Axis(yAxis)

  const handleMouse = (e: React.MouseEvent, row: ScoreRow) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, row })
  }

  const keys = Object.keys(SCORE_COLORS) as Array<keyof typeof SCORE_COLORS>

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
              {data.map((d) => {
                let cumX = 0
                return (
                  <g
                    key={d.name}
                    transform={`translate(0,${yScale(d.name) ?? 0})`}
                  >
                    {keys.map((key, i) => {
                      const val = d[key]
                      const x = xScale(cumX)
                      const w = xScale(cumX + val) - xScale(cumX)
                      cumX += val
                      return (
                        <rect
                          key={key}
                          x={x}
                          y={0}
                          width={Math.max(0, w)}
                          height={yScale.bandwidth()}
                          fill={SCORE_COLORS[key]}
                          rx={i === keys.length - 1 ? 2 : 0}
                          onMouseMove={(e) => handleMouse(e, d)}
                          onMouseLeave={() => setTooltip(null)}
                        />
                      )
                    })}
                  </g>
                )
              })}
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
                <p className="font-medium text-xs mb-2">{tooltip.row.name}</p>
                <div className="space-y-0.5">
                  {keys.map((key) => (
                    <div
                      key={key}
                      className="flex items-center gap-2 text-xs"
                    >
                      <span
                        className="inline-block size-2 rounded-full"
                        style={{ backgroundColor: SCORE_COLORS[key] }}
                      />
                      <span className="flex-1">{SCORE_LABELS[key]}</span>
                      <span className="tabular-nums font-medium">
                        {tooltip.row[key].toFixed(1)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="border-t mt-1.5 pt-1.5 flex justify-between text-xs font-semibold">
                  <span>Total</span>
                  <span className="tabular-nums">
                    {tooltip.row.total.toFixed(1)}
                  </span>
                </div>
              </>
            )}
          </ChartTooltip>
        </>
      )}
    </div>
  )
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
          engagementPct: stats?.avgEngagement ?? null,
          _max: Math.max(avgShort, avgFull),
        }
      })
      .filter((r) => r._max > 0)
      .sort((a, b) => b._max - a._max)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
      {/* ── 1.0: Short vs Full Avg Views (full width) ── */}
      <div className="rounded-lg border p-5">
        <h3 className="text-sm font-semibold mb-4">
          Short vs Full-Length — Avg Views per Creator
        </h3>
        <AvgViewsChart data={avgViewsData} />
        <ChartLegend
          entries={[
            ...AVG_VIEWS_SERIES.map((s) => ({
              label: s.label,
              color: s.color,
            })),
            { label: "Engagement %", color: ENGAGEMENT_COLOR, shape: "line" as const },
          ]}
          className="mt-2"
        />
      </div>

      {/* ── 1.3 Subscribers vs Total Views (full width) ── */}
      <div className="rounded-lg border p-5">
        <h3 className="text-sm font-semibold mb-4">
          Subscribers vs Total Views (Power Regression)
        </h3>
        <RegressionChart data={subsViewsData} regressionLine={regressionLine} />
        <ChartLegend
          entries={[
            { label: "Creators", color: "#8b5cf6" },
            { label: "Regression", color: "#f59e0b", shape: "line" },
          ]}
          className="mt-2"
        />
      </div>

      {/* ── 1.4 Success Score Ranking (full width) ── */}
      <div className="rounded-lg border p-5">
        <h3 className="text-sm font-semibold mb-4">
          Composite Success Score Ranking
        </h3>
        <ScoreRankingChart data={scoreData} />
        <ChartLegend
          entries={Object.entries(SCORE_COLORS).map(([key, color]) => ({
            label: SCORE_LABELS[key] ?? key,
            color,
            shape: "square" as const,
          }))}
          className="mt-2"
        />
      </div>

      {/* ── Row: 1.1 + 1.2 scatter plots ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 1.1 Subscribers vs Engagement */}
        <div className="rounded-lg border p-5">
          <h3 className="text-sm font-semibold mb-4">
            Subscribers vs Engagement Rate
          </h3>
          <EngagementScatterChart data={engagementData} />
          <ChartLegend
            entries={uniqueNiches.map((niche) => ({
              label: niche,
              color: NICHE_COLORS[niche] ?? "#94a3b8",
            }))}
            className="mt-3"
          />
        </div>

        {/* 1.2 Views-to-Sub Ratio vs Avg Views */}
        <div className="rounded-lg border p-5">
          <h3 className="text-sm font-semibold mb-4">
            Views-to-Sub Ratio vs Avg Views per Video
          </h3>
          <ViewsSubRatioChart data={viewsSubRatioData} />
          <ChartLegend
            entries={uniqueStatuses.map((status) => ({
              label: status,
              color: STATUS_COLORS[status] ?? STATUS_COLORS.Monitoring,
            }))}
            className="mt-3"
          />
        </div>
      </div>
    </div>
  )
}
