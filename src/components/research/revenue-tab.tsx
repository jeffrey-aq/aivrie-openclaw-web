"use client"

import { useMemo, useState } from "react"
import { scaleBand, scaleLinear, scaleSqrt } from "d3-scale"
import { axisBottom, axisLeft } from "d3-axis"
import { max } from "d3-array"
import { pie as d3pie, arc as d3arc } from "d3-shape"
import type { PieArcDatum } from "d3-shape"
import type { DashboardData, CreatorFull } from "@/app/research/page"
import {
  revenueToOrdinal,
  ordinalToRevenue,
  formatNumber,
  toNum,
} from "@/components/research/chart-utils"
import { useChartDimensions } from "@/components/research/d3/use-chart-dimensions"
import { useD3Axis } from "@/components/research/d3/use-d3-axis"
import { ChartGrid } from "@/components/research/d3/grid"
import { ChartTooltip } from "@/components/research/d3/tooltip"
import { ChartLegend } from "@/components/research/d3/legend"

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

// ─── Chart 5.1: Revenue Tier Pie Chart ──────────────────────────────────────

function TierPieChart({ data }: { data: TierSlice[] }) {
  const HEIGHT = 360
  const OUTER_RADIUS = 110
  const LABEL_RADIUS = OUTER_RADIUS + 25
  const margin = { top: 10, right: 10, bottom: 10, left: 10 }
  const [ref, dims] = useChartDimensions(margin)
  const [tooltip, setTooltip] = useState<{
    x: number
    y: number
    slice: TierSlice
  } | null>(null)

  const total = useMemo(
    () => data.reduce((s, d) => s + d.value, 0),
    [data],
  )

  const pieGen = useMemo(
    () => d3pie<TierSlice>().value((d) => d.value).sort(null),
    [],
  )

  const arcGen = useMemo(
    () =>
      d3arc<PieArcDatum<TierSlice>>()
        .innerRadius(0)
        .outerRadius(OUTER_RADIUS),
    [],
  )

  const arcs = useMemo(() => pieGen(data), [pieGen, data])

  const handleMouse = (e: React.MouseEvent, slice: TierSlice) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setTooltip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      slice,
    })
  }

  return (
    <div ref={ref} className="relative w-full" style={{ height: HEIGHT }}>
      {dims.width > 0 && (
        <>
          <svg width={dims.width} height={HEIGHT}>
            <g transform={`translate(${dims.width / 2},${HEIGHT / 2})`}>
              {arcs.map((a, i) => (
                <path
                  key={a.data.name}
                  d={arcGen(a)!}
                  fill={a.data.fill}
                  onMouseMove={(e) => handleMouse(e, a.data)}
                  onMouseLeave={() => setTooltip(null)}
                />
              ))}
              {arcs.map((a) => {
                const midAngle = (a.startAngle + a.endAngle) / 2
                const x = LABEL_RADIUS * Math.cos(midAngle - Math.PI / 2)
                const y = LABEL_RADIUS * Math.sin(midAngle - Math.PI / 2)
                if (a.data.value === 0) return null
                return (
                  <text
                    key={a.data.name}
                    x={x}
                    y={y}
                    textAnchor={x > 0 ? "start" : "end"}
                    dominantBaseline="central"
                    fontSize={11}
                    fill="var(--color-foreground)"
                  >
                    {`${a.data.name}: ${a.data.value}`}
                  </text>
                )
              })}
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
                  {tooltip.slice.name}
                </p>
                <p className="text-xs">
                  {tooltip.slice.value} creators (
                  {total > 0
                    ? ((tooltip.slice.value / total) * 100).toFixed(1)
                    : "0"}
                  %)
                </p>
              </>
            )}
          </ChartTooltip>
        </>
      )}
    </div>
  )
}

// ─── Chart 5.2: Revenue Tier vs Metrics (Vertical Grouped Bar) ──────────────

const TIER_METRICS_SERIES = [
  {
    key: "avgSubscribers" as const,
    label: "Avg Subscribers",
    color: "#3b82f6",
  },
  {
    key: "avgEngagement" as const,
    label: "Avg Engagement",
    color: "#6366f1",
  },
  {
    key: "avgVideoCount" as const,
    label: "Avg Video Count",
    color: "#10b981",
  },
]

function TierMetricsChart({ data }: { data: TierMetricsRow[] }) {
  const margin = { top: 10, right: 20, bottom: 30, left: 50 }
  const HEIGHT = 360
  const [ref, dims] = useChartDimensions(margin)
  const [tooltip, setTooltip] = useState<{
    x: number
    y: number
    row: TierMetricsRow
  } | null>(null)

  const xScale = useMemo(
    () =>
      scaleBand<string>()
        .domain(data.map((d) => d.tier))
        .range([0, dims.innerWidth])
        .padding(0.2),
    [data, dims.innerWidth],
  )

  const xInner = useMemo(
    () =>
      scaleBand<string>()
        .domain(TIER_METRICS_SERIES.map((s) => s.key))
        .range([0, xScale.bandwidth()])
        .padding(0.05),
    [xScale],
  )

  const yScale = useMemo(
    () =>
      scaleLinear()
        .domain([0, 100])
        .range([dims.innerHeight, 0]),
    [dims.innerHeight],
  )

  const xAxis = useMemo(
    () => (dims.innerWidth > 0 ? axisBottom(xScale) : null),
    [xScale, dims.innerWidth],
  )
  const yAxis = useMemo(
    () =>
      dims.innerHeight > 0
        ? axisLeft(yScale).tickFormat((d) => `${d}`)
        : null,
    [yScale, dims.innerHeight],
  )

  const xAxisRef = useD3Axis(xAxis)
  const yAxisRef = useD3Axis(yAxis)

  const handleMouse = (e: React.MouseEvent, row: TierMetricsRow) => {
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
                  key={d.tier}
                  transform={`translate(${xScale(d.tier) ?? 0},0)`}
                >
                  {TIER_METRICS_SERIES.map((s) => {
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
                <p className="font-medium text-xs mb-1">{tooltip.row.tier}</p>
                {TIER_METRICS_SERIES.map((s) => (
                  <p key={s.key} className="text-xs">
                    {s.label}: {tooltip.row[s.key].toFixed(1)}
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

// ─── Chart 5.3: Monetization Frequency (Horizontal Stacked Bar) ─────────────

function MonetizationStackChart({
  data,
  height,
}: {
  data: MonetizationStackRow[]
  height: number
}) {
  const margin = { top: 5, right: 20, bottom: 30, left: 100 }
  const [ref, dims] = useChartDimensions(margin)
  const [tooltip, setTooltip] = useState<{
    x: number
    y: number
    method: string
    tier: string
    count: number
  } | null>(null)

  const yScale = useMemo(
    () =>
      scaleBand<string>()
        .domain(data.map((d) => d.method))
        .range([0, dims.innerHeight])
        .padding(0.2),
    [data, dims.innerHeight],
  )

  const maxTotal = useMemo(
    () => max(data, (d) => d.total) ?? 0,
    [data],
  )

  const xScale = useMemo(
    () =>
      scaleLinear()
        .domain([0, maxTotal])
        .nice()
        .range([0, dims.innerWidth]),
    [maxTotal, dims.innerWidth],
  )

  const xAxis = useMemo(
    () =>
      dims.innerWidth > 0
        ? axisBottom(xScale).ticks(Math.min(maxTotal, 10))
        : null,
    [xScale, dims.innerWidth, maxTotal],
  )
  const yAxis = useMemo(
    () => (dims.innerHeight > 0 ? axisLeft(yScale) : null),
    [yScale, dims.innerHeight],
  )

  const xAxisRef = useD3Axis(xAxis)
  const yAxisRef = useD3Axis(yAxis)

  const handleMouse = (
    e: React.MouseEvent,
    method: string,
    tier: string,
    count: number,
  ) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setTooltip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      method,
      tier,
      count,
    })
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
              {data.map((d) => {
                let cumX = 0
                return (
                  <g
                    key={d.method}
                    transform={`translate(0,${yScale(d.method) ?? 0})`}
                  >
                    {REVENUE_TIERS.map((tier, i) => {
                      const val = d[tier]
                      const x = xScale(cumX)
                      const w = xScale(cumX + val) - xScale(cumX)
                      cumX += val
                      return (
                        <rect
                          key={tier}
                          x={x}
                          y={0}
                          width={Math.max(0, w)}
                          height={yScale.bandwidth()}
                          fill={REVENUE_COLORS[tier]}
                          rx={i === REVENUE_TIERS.length - 1 ? 2 : 0}
                          onMouseMove={(e) =>
                            handleMouse(e, d.method, tier, val)
                          }
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
                <p className="font-medium text-xs mb-1">{tooltip.method}</p>
                <p className="text-xs">
                  {tooltip.tier}: {tooltip.count} creators
                </p>
              </>
            )}
          </ChartTooltip>
        </>
      )}
    </div>
  )
}

// ─── Chart 5.4: Monetization Diversity (Scatter with labels) ────────────────

function DiversityScatterChart({ data }: { data: DiversityDot[] }) {
  const margin = { top: 10, right: 20, bottom: 45, left: 70 }
  const HEIGHT = 400
  const [ref, dims] = useChartDimensions(margin)
  const [tooltip, setTooltip] = useState<{
    x: number
    y: number
    row: DiversityDot
  } | null>(null)

  const maxMonetization = useMemo(
    () => max(data, (d) => d.monetizationCount) ?? 1,
    [data],
  )

  const maxSubs = useMemo(
    () => max(data, (d) => d.subscribers) ?? 1,
    [data],
  )

  const xScale = useMemo(
    () =>
      scaleLinear()
        .domain([0, maxMonetization + 1])
        .range([0, dims.innerWidth]),
    [maxMonetization, dims.innerWidth],
  )

  const yScale = useMemo(
    () =>
      scaleLinear()
        .domain([0.5, 5.5])
        .range([dims.innerHeight, 0]),
    [dims.innerHeight],
  )

  const rScale = useMemo(
    () => scaleSqrt().domain([0, maxSubs]).range([4, 20]),
    [maxSubs],
  )

  const xAxis = useMemo(
    () => {
      if (dims.innerWidth <= 0) return null
      const intTicks: number[] = []
      for (let i = 0; i <= maxMonetization + 1; i++) intTicks.push(i)
      return axisBottom(xScale)
        .tickValues(intTicks)
        .tickFormat((d) => `${d}`)
    },
    [xScale, dims.innerWidth, maxMonetization],
  )

  const yAxis = useMemo(
    () =>
      dims.innerHeight > 0
        ? axisLeft(yScale)
            .tickValues([1, 2, 3, 4, 5])
            .tickFormat((d) => ordinalToRevenue(Number(d)))
        : null,
    [yScale, dims.innerHeight],
  )

  const xAxisRef = useD3Axis(xAxis)
  const yAxisRef = useD3Axis(yAxis)

  const handleMouse = (e: React.MouseEvent, row: DiversityDot) => {
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
                      cx={xScale(d.monetizationCount)}
                      cy={yScale(d.revenueOrdinal)}
                      r={r}
                      fill="#6366f1"
                      fillOpacity={0.75}
                      stroke="#6366f1"
                      strokeWidth={1}
                      onMouseMove={(e) => handleMouse(e, d)}
                      onMouseLeave={() => setTooltip(null)}
                    />
                    <text
                      x={xScale(d.monetizationCount)}
                      y={yScale(d.revenueOrdinal) - r - 4}
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
                Number of Monetization Types
              </text>
              <text
                transform="rotate(-90)"
                x={-dims.innerHeight / 2}
                y={-margin.left + 15}
                textAnchor="middle"
                fontSize={11}
                fill="var(--color-muted-foreground)"
              >
                Revenue Tier
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
                  Monetization Types: {tooltip.row.monetizationCount}
                </p>
                <p className="text-xs">
                  Revenue: {ordinalToRevenue(tooltip.row.revenueOrdinal)}
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
          <TierPieChart data={tierPieData} />
          <ChartLegend
            entries={REVENUE_TIERS.map((tier) => ({
              label: tier,
              color: REVENUE_COLORS[tier],
              shape: "square" as const,
            }))}
            className="mt-2"
          />
        </div>

        {/* 5.2 Revenue Tier vs Metrics (normalized) */}
        <div className="rounded-lg border p-5">
          <h3 className="text-sm font-semibold mb-4">
            Revenue Tier vs Metrics (normalized)
          </h3>
          <TierMetricsChart data={tierMetricsData} />
          <ChartLegend
            entries={TIER_METRICS_SERIES.map((s) => ({
              label: s.label,
              color: s.color,
            }))}
            className="mt-2"
          />
        </div>
      </div>

      {/* Row 2: Charts 5.3 & 5.4 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 5.3 Monetization Frequency (horizontal stacked bar) */}
        <div className="rounded-lg border p-5">
          <h3 className="text-sm font-semibold mb-4">
            Monetization Frequency by Revenue Tier
          </h3>
          <MonetizationStackChart
            data={monetizationStackData}
            height={Math.max(monetizationStackData.length * 40 + 60, 200)}
          />
          <ChartLegend
            entries={REVENUE_TIERS.map((tier) => ({
              label: tier,
              color: REVENUE_COLORS[tier],
              shape: "square" as const,
            }))}
            className="mt-2"
          />
        </div>

        {/* 5.4 Monetization Diversity (Scatter) */}
        <div className="rounded-lg border p-5">
          <h3 className="text-sm font-semibold mb-4">
            Monetization Diversity vs Revenue
          </h3>
          <DiversityScatterChart data={diversityData} />
        </div>
      </div>
    </div>
  )
}
