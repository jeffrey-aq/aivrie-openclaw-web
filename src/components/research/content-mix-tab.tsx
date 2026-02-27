"use client"

import { useMemo, useState, useEffect, useRef } from "react"
import regression from "regression"
import { TrendingUp, BarChart3 } from "lucide-react"
import { scaleBand, scaleLinear } from "d3-scale"
import { axisBottom, axisLeft } from "d3-axis"
import { max } from "d3-array"
import { line as d3line, area as d3area } from "d3-shape"
import { select } from "d3-selection"
import type {
  DashboardData,
  HistogramRow,
} from "@/app/research/page"
import { useChartDimensions } from "@/components/research/d3/use-chart-dimensions"
import { useD3Axis } from "@/components/research/d3/use-d3-axis"
import { ChartGrid } from "@/components/research/d3/grid"
import { ChartTooltip } from "@/components/research/d3/tooltip"

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
  xLabel,
  data,
  color,
  trendColor,
}: {
  title: string
  xLabel?: string
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
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {xLabel && (
            <p className="text-xs text-muted-foreground mt-0.5">{xLabel}</p>
          )}
        </div>
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

// ─── Main component ─────────────────────────────────────────────────────────

export function ContentMixTab({ data }: { data: DashboardData }) {
  const { histograms } = data

  return (
    <div className="space-y-6">
      {/* Histograms */}
      <div className="grid gap-6 md:grid-cols-2">
        <ViewsHistogramChart
          title="Short Videos — Views"
          xLabel="X axis is thousands"
          data={histograms.shortViews}
          color="#f472b6"
          trendColor="#a3e635"
        />
        <ViewsHistogramChart
          title="Full-Length Videos — Views"
          xLabel="X axis is thousands"
          data={histograms.fullViews}
          color="#38bdf8"
          trendColor="#c084fc"
        />
        <ViewsHistogramChart
          title="Short Videos — Duration"
          xLabel="X axis is seconds"
          data={histograms.shortDuration}
          color="#ec4899"
          trendColor="#facc15"
        />
        <ViewsHistogramChart
          title="Full-Length Videos — Duration"
          xLabel="X axis is minutes"
          data={histograms.fullDuration}
          color="#0ea5e9"
          trendColor="#f97316"
        />
      </div>
    </div>
  )
}
