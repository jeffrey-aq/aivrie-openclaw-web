"use client"

import { useMemo, useState } from "react"
import { scaleBand, scaleLinear, scaleSqrt } from "d3-scale"
import { axisBottom, axisLeft } from "d3-axis"
import { max, extent } from "d3-array"
import type { DashboardData } from "@/app/research/page"
import {
  TOOLTIP_STYLE,
  NICHE_COLORS,
  formatNumber,
  toNum,
} from "@/components/research/chart-utils"
import { useChartDimensions } from "@/components/research/d3/use-chart-dimensions"
import { useD3Axis } from "@/components/research/d3/use-d3-axis"
import { ChartGrid } from "@/components/research/d3/grid"
import { ChartTooltip } from "@/components/research/d3/tooltip"
import { ChartLegend } from "@/components/research/d3/legend"

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

function groupBy<T>(
  items: T[],
  key: (item: T) => string | null,
): Map<string, T[]> {
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

// ─── Chart 2.1: Upload Frequency vs Performance (Vertical Grouped Bar) ──────

const FREQ_SERIES = [
  {
    key: "avgSubscribers" as const,
    label: "Avg Subscribers",
    color: "#3b82f6",
  },
  {
    key: "avgViewsPerVideo" as const,
    label: "Avg Views/Video",
    color: "#10b981",
  },
]

function FreqPerformanceChart({ data }: { data: FreqRow[] }) {
  const margin = { top: 10, right: 20, bottom: 30, left: 70 }
  const HEIGHT = 320
  const [ref, dims] = useChartDimensions(margin)
  const [tooltip, setTooltip] = useState<{
    x: number
    y: number
    row: FreqRow
  } | null>(null)

  const xScale = useMemo(
    () =>
      scaleBand<string>()
        .domain(data.map((d) => d.frequency))
        .range([0, dims.innerWidth])
        .padding(0.2),
    [data, dims.innerWidth],
  )

  const xInner = useMemo(
    () =>
      scaleBand<string>()
        .domain(FREQ_SERIES.map((s) => s.key))
        .range([0, xScale.bandwidth()])
        .padding(0.05),
    [xScale],
  )

  const maxVal = useMemo(
    () =>
      max(data.flatMap((d) => [d.avgSubscribers, d.avgViewsPerVideo])) ?? 0,
    [data],
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

  const handleMouse = (e: React.MouseEvent, row: FreqRow) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setTooltip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      row,
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
                yTicks={yScale.ticks().map((t) => yScale(t))}
                vertical={false}
              />
              {data.map((d) => (
                <g
                  key={d.frequency}
                  transform={`translate(${xScale(d.frequency) ?? 0},0)`}
                >
                  {FREQ_SERIES.map((s) => {
                    const val = d[s.key]
                    return (
                      <rect
                        key={s.key}
                        x={xInner(s.key) ?? 0}
                        y={yScale(val)}
                        width={xInner.bandwidth()}
                        height={Math.max(0, dims.innerHeight - yScale(val))}
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
            containerHeight={HEIGHT}
          >
            {tooltip && (
              <>
                <p className="font-medium text-xs mb-1">
                  {tooltip.row.frequency}
                </p>
                <p className="text-xs">
                  Avg Subscribers: {formatNumber(tooltip.row.avgSubscribers)}
                </p>
                <p className="text-xs">
                  Avg Views/Video:{" "}
                  {formatNumber(tooltip.row.avgViewsPerVideo)}
                </p>
              </>
            )}
          </ChartTooltip>
        </>
      )}
    </div>
  )
}

// ─── Chart 2.2: Niche Performance (Horizontal Grouped Bar, Normalized) ──────

const NICHE_SERIES = [
  {
    key: "normSubs" as const,
    rawKey: "rawSubs" as const,
    label: "Subscribers",
    color: "#3b82f6",
    formatRaw: (v: number) => formatNumber(v),
  },
  {
    key: "normEngagement" as const,
    rawKey: "rawEngagement" as const,
    label: "Engagement",
    color: "#6366f1",
    formatRaw: (v: number) => `${v.toFixed(2)}%`,
  },
  {
    key: "normViewsToSub" as const,
    rawKey: "rawViewsToSub" as const,
    label: "Views:Sub Ratio",
    color: "#10b981",
    formatRaw: (v: number) => `${v.toFixed(1)}%`,
  },
]

function NichePerformanceChart({
  data,
  height,
}: {
  data: NicheRow[]
  height: number
}) {
  const margin = { top: 5, right: 20, bottom: 30, left: 100 }
  const [ref, dims] = useChartDimensions(margin)
  const [tooltip, setTooltip] = useState<{
    x: number
    y: number
    row: NicheRow
  } | null>(null)

  const yScale = useMemo(
    () =>
      scaleBand<string>()
        .domain(data.map((d) => d.niche))
        .range([0, dims.innerHeight])
        .padding(0.2),
    [data, dims.innerHeight],
  )

  const yInner = useMemo(
    () =>
      scaleBand<string>()
        .domain(NICHE_SERIES.map((s) => s.key))
        .range([0, yScale.bandwidth()])
        .padding(0.05),
    [yScale],
  )

  const xScale = useMemo(
    () => scaleLinear().domain([0, 100]).range([0, dims.innerWidth]),
    [dims.innerWidth],
  )

  const xAxis = useMemo(
    () => (dims.innerWidth > 0 ? axisBottom(xScale) : null),
    [xScale, dims.innerWidth],
  )
  const yAxis = useMemo(
    () => (dims.innerHeight > 0 ? axisLeft(yScale) : null),
    [yScale, dims.innerHeight],
  )

  const xAxisRef = useD3Axis(xAxis)
  const yAxisRef = useD3Axis(yAxis)

  const handleMouse = (e: React.MouseEvent, row: NicheRow) => {
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
                  key={d.niche}
                  transform={`translate(0,${yScale(d.niche) ?? 0})`}
                >
                  {NICHE_SERIES.map((s) => {
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
                <p className="font-medium text-xs mb-1">
                  {tooltip.row.niche}
                </p>
                {NICHE_SERIES.map((s) => (
                  <p key={s.key} className="text-xs">
                    {s.label}: {tooltip.row[s.key].toFixed(0)} (
                    {s.formatRaw(tooltip.row[s.rawKey])})
                  </p>
                ))}
              </>
            )}
          </ChartTooltip>
        </>
      )}
    </div>
  )
}

// ─── Chart 2.3: Video Length Sweet Spot (Bubble Scatter) ─────────────────────

function LengthScatterChart({ data }: { data: LengthDot[] }) {
  const margin = { top: 10, right: 20, bottom: 45, left: 70 }
  const HEIGHT = 360
  const [ref, dims] = useChartDimensions(margin)
  const [tooltip, setTooltip] = useState<{
    x: number
    y: number
    row: LengthDot
  } | null>(null)

  const xExt = useMemo(
    () => extent(data, (d) => d.length) as [number, number],
    [data],
  )
  const yExt = useMemo(
    () => extent(data, (d) => d.avgViews) as [number, number],
    [data],
  )
  const maxSubs = useMemo(() => max(data, (d) => d.subscribers) ?? 1, [data])

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
  const rScale = useMemo(
    () => scaleSqrt().domain([0, maxSubs]).range([4, 20]),
    [maxSubs],
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

  const handleMouse = (e: React.MouseEvent, row: LengthDot) => {
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
                const r = rScale(d.subscribers)
                return (
                  <g key={i}>
                    <circle
                      cx={xScale(d.length)}
                      cy={yScale(d.avgViews)}
                      r={r}
                      fill={NICHE_COLORS[d.niche] ?? "#94a3b8"}
                      fillOpacity={0.75}
                      stroke={NICHE_COLORS[d.niche] ?? "#94a3b8"}
                      strokeWidth={1}
                      onMouseMove={(e) => handleMouse(e, d)}
                      onMouseLeave={() => setTooltip(null)}
                    />
                    <text
                      x={xScale(d.length)}
                      y={yScale(d.avgViews) - r - 4}
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
                Typical Video Length (min)
              </text>
              <text
                transform="rotate(-90)"
                x={-dims.innerHeight / 2}
                y={-margin.left + 15}
                textAnchor="middle"
                fontSize={11}
                fill="var(--color-muted-foreground)"
              >
                Avg Views / Video
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
                  {tooltip.row.name}
                </p>
                <p className="text-xs">
                  Video Length: {tooltip.row.length} min
                </p>
                <p className="text-xs">
                  Avg Views: {formatNumber(tooltip.row.avgViews)}
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

// ─── Chart 2.4: Content Type vs Engagement (Horizontal Single Bar) ──────────

function ContentEngagementChart({
  data,
  height,
}: {
  data: EngagementRow[]
  height: number
}) {
  const margin = { top: 5, right: 20, bottom: 30, left: 100 }
  const [ref, dims] = useChartDimensions(margin)
  const [tooltip, setTooltip] = useState<{
    x: number
    y: number
    row: EngagementRow
  } | null>(null)

  const yScale = useMemo(
    () =>
      scaleBand<string>()
        .domain(data.map((d) => d.contentType))
        .range([0, dims.innerHeight])
        .padding(0.3),
    [data, dims.innerHeight],
  )

  const maxEng = useMemo(
    () => max(data, (d) => d.avgEngagement) ?? 0,
    [data],
  )

  const xScale = useMemo(
    () =>
      scaleLinear()
        .domain([0, maxEng])
        .nice()
        .range([0, dims.innerWidth]),
    [maxEng, dims.innerWidth],
  )

  const xAxis = useMemo(
    () =>
      dims.innerWidth > 0
        ? axisBottom(xScale).tickFormat((d) => `${Number(d)}%`)
        : null,
    [xScale, dims.innerWidth],
  )
  const yAxis = useMemo(
    () => (dims.innerHeight > 0 ? axisLeft(yScale) : null),
    [yScale, dims.innerHeight],
  )

  const xAxisRef = useD3Axis(xAxis)
  const yAxisRef = useD3Axis(yAxis)

  const handleMouse = (e: React.MouseEvent, row: EngagementRow) => {
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
                <rect
                  key={d.contentType}
                  x={0}
                  y={yScale(d.contentType) ?? 0}
                  width={Math.max(0, xScale(d.avgEngagement))}
                  height={yScale.bandwidth()}
                  fill="#6366f1"
                  rx={2}
                  onMouseMove={(e) => handleMouse(e, d)}
                  onMouseLeave={() => setTooltip(null)}
                />
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
                <p className="font-medium text-xs mb-1">
                  {tooltip.row.contentType}
                </p>
                <p className="text-xs">
                  Avg Engagement: {tooltip.row.avgEngagement.toFixed(2)}%
                </p>
              </>
            )}
          </ChartTooltip>
        </>
      )}
    </div>
  )
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
    const raw: {
      niche: string
      avgSubs: number
      avgEng: number
      avgVSR: number
    }[] = []

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
          c.avgViewsPerVideo > 0,
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
          <FreqPerformanceChart data={freqData} />
          <ChartLegend
            entries={FREQ_SERIES.map((s) => ({
              label: s.label,
              color: s.color,
            }))}
            className="mt-2"
          />
        </div>

        {/* 2.2 Niche Performance (normalized) */}
        <div className="rounded-lg border p-5">
          <h3 className="text-sm font-semibold mb-4">
            Niche Performance (normalized)
          </h3>
          <NichePerformanceChart
            data={nicheData}
            height={Math.max(nicheData.length * 40 + 40, 200)}
          />
          <ChartLegend
            entries={NICHE_SERIES.map((s) => ({
              label: s.label,
              color: s.color,
            }))}
            className="mt-2"
          />
        </div>
      </div>

      {/* Row 2: Charts 2.3 & 2.4 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 2.3 Video Length Sweet Spot */}
        <div className="rounded-lg border p-5">
          <h3 className="text-sm font-semibold mb-4">
            Video Length Sweet Spot
          </h3>
          <LengthScatterChart data={lengthData} />
          <ChartLegend
            entries={Object.entries(NICHE_COLORS).map(([niche, color]) => ({
              label: niche,
              color,
            }))}
            className="mt-3"
          />
        </div>

        {/* 2.4 Content Type vs Engagement */}
        <div className="rounded-lg border p-5">
          <h3 className="text-sm font-semibold mb-4">
            Content Type vs Engagement
          </h3>
          <ContentEngagementChart
            data={engagementData}
            height={Math.max(engagementData.length * 40 + 40, 200)}
          />
        </div>
      </div>
    </div>
  )
}
