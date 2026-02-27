"use client"

import { useMemo, useState, useRef, useEffect, useCallback } from "react"
import { scaleLog, scaleLinear, scaleSqrt } from "d3-scale"
import { axisBottom, axisLeft } from "d3-axis"
import { max, extent } from "d3-array"
import type { DashboardData, CreatorFull, VideoStats } from "@/app/research/page"
import {
  percentile,
  revenueToOrdinal,
  frequencyToScore,
  TOOLTIP_STYLE,
  THREAT_COLORS,
  getCreatorColor,
  formatNumber,
  toNum,
} from "@/components/research/chart-utils"
import { useChartDimensions } from "@/components/research/d3/use-chart-dimensions"
import { useD3Axis } from "@/components/research/d3/use-d3-axis"
import { ChartGrid } from "@/components/research/d3/grid"
import { ChartTooltip } from "@/components/research/d3/tooltip"
import { ChartLegend } from "@/components/research/d3/legend"

// ─── Radar axis labels ──────────────────────────────────────────────────────
const RADAR_AXES = [
  "Subscribers%",
  "Engagement%",
  "Views-to-Sub%",
  "Upload Consistency",
  "Volume%",
  "Revenue Tier",
] as const

type RadarDatum = {
  axis: string
  value: number
}

type CreatorRadarProfile = {
  channelId: string
  title: string
  color: string
  data: RadarDatum[]
}

// ─── Build radar profile for one creator ────────────────────────────────────
function buildRadarData(
  creator: CreatorFull,
  allCreators: CreatorFull[],
  videoStats: Map<string, VideoStats>,
): RadarDatum[] {
  const allSubs = allCreators.map((c: CreatorFull) => toNum(c.subscribers))
  const allEngagement = allCreators.map(
    (c: CreatorFull) => videoStats.get(c.channelId)?.avgEngagement ?? 0,
  )
  const allViewsToSub = allCreators.map(
    (c: CreatorFull) => c.viewsToSubRatio ?? 0,
  )
  const allVideoCount = allCreators.map(
    (c: CreatorFull) => videoStats.get(c.channelId)?.videoCount ?? 0,
  )

  const subs = percentile(toNum(creator.subscribers), allSubs)
  const eng = percentile(
    videoStats.get(creator.channelId)?.avgEngagement ?? 0,
    allEngagement,
  )
  const viewsSub = percentile(creator.viewsToSubRatio ?? 0, allViewsToSub)
  const uploadConsistency =
    (frequencyToScore(creator.uploadFrequency) / 6) * 100
  const volume = percentile(
    videoStats.get(creator.channelId)?.videoCount ?? 0,
    allVideoCount,
  )
  const revTier = (revenueToOrdinal(creator.estRevenueRange) / 5) * 100

  return [
    { axis: RADAR_AXES[0], value: subs },
    { axis: RADAR_AXES[1], value: eng },
    { axis: RADAR_AXES[2], value: viewsSub },
    { axis: RADAR_AXES[3], value: uploadConsistency },
    { axis: RADAR_AXES[4], value: volume },
    { axis: RADAR_AXES[5], value: revTier },
  ]
}

// ─── Multi-select dropdown component ────────────────────────────────────────
interface MultiSelectOption {
  value: string
  label: string
}

function MultiSelectDropdown({
  options,
  selected,
  onChange,
  maxSelections,
}: {
  options: MultiSelectOption[]
  selected: string[]
  onChange: (next: string[]) => void
  maxSelections: number
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (
      containerRef.current &&
      !containerRef.current.contains(e.target as Node)
    ) {
      setOpen(false)
    }
  }, [])

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [handleClickOutside])

  function toggle(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value))
    } else if (selected.length < maxSelections) {
      onChange([...selected, value])
    }
  }

  const selectedLabels = options
    .filter((o) => selected.includes(o.value))
    .map((o) => o.label)

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
      >
        <span className="max-w-[300px] truncate">
          {selectedLabels.length > 0
            ? selectedLabels.join(", ")
            : "Select creators..."}
        </span>
        <svg
          className={`size-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-72 max-h-64 overflow-y-auto rounded-md border border-border bg-popover shadow-lg">
          {options.map((opt) => {
            const checked = selected.includes(opt.value)
            const disabled = !checked && selected.length >= maxSelections
            return (
              <label
                key={opt.value}
                className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-accent transition-colors ${
                  disabled ? "opacity-40 cursor-not-allowed" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => toggle(opt.value)}
                  className="rounded border-input"
                />
                <span className="truncate">{opt.label}</span>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Scatter data types ─────────────────────────────────────────────────────
interface ThreatDatum {
  name: string
  subscribers: number
  engagement: number
  totalViews: number
  threat: string
}

// ─── Custom threat legend ────────────────────────────────────────────────────
function ThreatLegend() {
  const entries = [
    { label: "High Threat", color: THREAT_COLORS.High },
    { label: "Medium Threat", color: THREAT_COLORS.Medium },
    { label: "Low Threat", color: THREAT_COLORS.Low },
  ]
  return (
    <div className="flex items-center justify-center gap-4 mt-2">
      {entries.map((e) => (
        <div key={e.label} className="flex items-center gap-1.5">
          <span
            className="inline-block size-3 rounded-full"
            style={{ backgroundColor: e.color }}
          />
          <span className="text-xs text-muted-foreground">{e.label}</span>
        </div>
      ))}
    </div>
  )
}

// ─── 3.1 Small Radar Chart (individual creator) ─────────────────────────────

function SmallRadarChart({
  profile,
  size = 200,
}: {
  profile: CreatorRadarProfile
  size?: number
}) {
  const cx = size / 2
  const cy = size / 2
  const outerRadius = 60
  const axes = RADAR_AXES
  const angleStep = (2 * Math.PI) / axes.length
  const gridLevels = [20, 40, 60, 80, 100]

  const [tooltip, setTooltip] = useState<{
    x: number
    y: number
    datum: RadarDatum
  } | null>(null)

  const points = profile.data.map((d, i) => {
    const angle = i * angleStep - Math.PI / 2
    const r = (d.value / 100) * outerRadius
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
  })

  const polygonPoints = points.map((p) => `${p.x},${p.y}`).join(" ")

  const handlePointMouse = (
    e: React.MouseEvent<SVGCircleElement>,
    datum: RadarDatum,
  ) => {
    const svg = (e.target as SVGElement).closest("svg")
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    setTooltip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      datum,
    })
  }

  return (
    <div className="relative" style={{ width: size, height: size, margin: "0 auto" }}>
      <svg width={size} height={size}>
        {/* Concentric circles */}
        {gridLevels.map((level) => (
          <circle
            key={level}
            cx={cx}
            cy={cy}
            r={(level / 100) * outerRadius}
            fill="none"
            stroke="var(--color-border)"
            strokeOpacity={0.3}
          />
        ))}
        {/* Axis lines */}
        {axes.map((_, i) => {
          const angle = i * angleStep - Math.PI / 2
          const x2 = cx + outerRadius * Math.cos(angle)
          const y2 = cy + outerRadius * Math.sin(angle)
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={x2}
              y2={y2}
              stroke="var(--color-border)"
              strokeOpacity={0.3}
            />
          )
        })}
        {/* Axis labels */}
        {axes.map((label, i) => {
          const angle = i * angleStep - Math.PI / 2
          const labelR = outerRadius + 12
          const x = cx + labelR * Math.cos(angle)
          const y = cy + labelR * Math.sin(angle)
          return (
            <text
              key={label}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={8}
              fill="var(--color-muted-foreground)"
            >
              {label}
            </text>
          )
        })}
        {/* Data polygon */}
        <polygon
          points={polygonPoints}
          fill={profile.color}
          fillOpacity={0.3}
          stroke={profile.color}
          strokeWidth={2}
        />
        {/* Hover targets at each data point */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={4}
            fill={profile.color}
            fillOpacity={0}
            stroke="none"
            className="cursor-pointer"
            onMouseMove={(e) => handlePointMouse(e, profile.data[i])}
            onMouseLeave={() => setTooltip(null)}
          />
        ))}
      </svg>
      <ChartTooltip
        x={tooltip?.x ?? 0}
        y={tooltip?.y ?? 0}
        visible={tooltip !== null}
        containerWidth={size}
        containerHeight={size}
      >
        {tooltip && (
          <>
            <p className="font-medium text-xs mb-1">{tooltip.datum.axis}</p>
            <p className="text-xs">{Math.round(tooltip.datum.value)}</p>
          </>
        )}
      </ChartTooltip>
    </div>
  )
}

// ─── 3.2 Comparison Radar Chart (overlaid polygons) ──────────────────────────

function ComparisonRadarChart({
  profiles,
}: {
  profiles: CreatorRadarProfile[]
}) {
  const margin = { top: 20, right: 20, bottom: 20, left: 20 }
  const HEIGHT = 400
  const [ref, dims] = useChartDimensions(margin)

  const [tooltip, setTooltip] = useState<{
    x: number
    y: number
    profile: CreatorRadarProfile
  } | null>(null)

  const axes = RADAR_AXES
  const angleStep = (2 * Math.PI) / axes.length
  const outerRadius = 120

  // The SVG center depends on the responsive width
  const svgWidth = dims.width
  const cx = svgWidth / 2
  const cy = HEIGHT / 2

  const gridLevels = [20, 40, 60, 80, 100]

  const handlePolygonMouse = (
    e: React.MouseEvent<SVGPolygonElement>,
    profile: CreatorRadarProfile,
  ) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setTooltip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      profile,
    })
  }

  return (
    <div ref={ref} className="relative w-full" style={{ height: HEIGHT }}>
      {dims.width > 0 && (
        <>
          <svg width={svgWidth} height={HEIGHT}>
            {/* Concentric circles */}
            {gridLevels.map((level) => (
              <circle
                key={level}
                cx={cx}
                cy={cy}
                r={(level / 100) * outerRadius}
                fill="none"
                stroke="var(--color-border)"
                strokeOpacity={0.3}
              />
            ))}
            {/* Axis lines */}
            {axes.map((_, i) => {
              const angle = i * angleStep - Math.PI / 2
              const x2 = cx + outerRadius * Math.cos(angle)
              const y2 = cy + outerRadius * Math.sin(angle)
              return (
                <line
                  key={i}
                  x1={cx}
                  y1={cy}
                  x2={x2}
                  y2={y2}
                  stroke="var(--color-border)"
                  strokeOpacity={0.3}
                />
              )
            })}
            {/* Axis labels */}
            {axes.map((label, i) => {
              const angle = i * angleStep - Math.PI / 2
              const labelR = outerRadius + 18
              const x = cx + labelR * Math.cos(angle)
              const y = cy + labelR * Math.sin(angle)
              return (
                <text
                  key={label}
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={11}
                  fill="var(--color-muted-foreground)"
                >
                  {label}
                </text>
              )
            })}
            {/* Data polygons for each profile */}
            {profiles.map((profile) => {
              const points = profile.data.map((d, i) => {
                const angle = i * angleStep - Math.PI / 2
                const r = (d.value / 100) * outerRadius
                return {
                  x: cx + r * Math.cos(angle),
                  y: cy + r * Math.sin(angle),
                }
              })
              const polygonStr = points
                .map((p) => `${p.x},${p.y}`)
                .join(" ")
              return (
                <polygon
                  key={profile.channelId}
                  points={polygonStr}
                  fill={profile.color}
                  fillOpacity={0.15}
                  stroke={profile.color}
                  strokeWidth={2}
                  className="cursor-pointer"
                  onMouseMove={(e) => handlePolygonMouse(e, profile)}
                  onMouseLeave={() => setTooltip(null)}
                />
              )
            })}
          </svg>
          {/* Legend */}
          <ChartLegend
            entries={profiles.map((p) => ({
              label: p.title,
              color: p.color,
            }))}
            className="mt-2"
          />
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
                  {tooltip.profile.title}
                </p>
                {tooltip.profile.data.map((d) => (
                  <p key={d.axis} className="text-xs">
                    {d.axis}: {Math.round(d.value)}
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

// ─── 3.3 Threat Scatter Chart (log-X bubble scatter) ─────────────────────────

function ThreatScatterChart({ data }: { data: ThreatDatum[] }) {
  const margin = { top: 20, right: 30, bottom: 50, left: 70 }
  const HEIGHT = 450
  const [ref, dims] = useChartDimensions(margin)
  const [tooltip, setTooltip] = useState<{
    x: number
    y: number
    row: ThreatDatum
  } | null>(null)

  const subsExtent = useMemo(
    () => extent(data, (d) => d.subscribers) as [number, number],
    [data],
  )
  const engExtent = useMemo(
    () => extent(data, (d) => d.engagement) as [number, number],
    [data],
  )
  const maxViews = useMemo(() => max(data, (d) => d.totalViews) ?? 1, [data])

  const xScale = useMemo(
    () =>
      scaleLog()
        .domain([Math.max(subsExtent[0] ?? 1, 1), subsExtent[1] ?? 10])
        .nice()
        .range([0, dims.innerWidth]),
    [subsExtent, dims.innerWidth],
  )

  const yScale = useMemo(
    () =>
      scaleLinear()
        .domain([0, engExtent[1] ?? 1])
        .nice()
        .range([dims.innerHeight, 0]),
    [engExtent, dims.innerHeight],
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

  const handleMouse = (e: React.MouseEvent, row: ThreatDatum) => {
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
                const cx = xScale(d.subscribers)
                const cy = yScale(d.engagement)
                const r = rScale(d.totalViews)
                const color =
                  THREAT_COLORS[d.threat] ?? THREAT_COLORS.Low
                return (
                  <g key={i}>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={r}
                      fill={color}
                      fillOpacity={0.7}
                      stroke={color}
                      strokeWidth={1}
                      className="cursor-pointer"
                      onMouseMove={(e) => handleMouse(e, d)}
                      onMouseLeave={() => setTooltip(null)}
                    />
                    <text
                      x={cx}
                      y={cy - r - 4}
                      textAnchor="middle"
                      fontSize={10}
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
              {/* X axis label */}
              <text
                x={dims.innerWidth / 2}
                y={dims.innerHeight + margin.bottom - 5}
                textAnchor="middle"
                fontSize={11}
                fill="var(--color-muted-foreground)"
              >
                Subscribers (log scale)
              </text>
              {/* Y axis label */}
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
                <p className="font-medium text-xs mb-1">
                  {tooltip.row.name} ({tooltip.row.threat} Threat)
                </p>
                <p className="text-xs">
                  Subscribers: {formatNumber(tooltip.row.subscribers)}
                </p>
                <p className="text-xs">
                  Avg Engagement: {tooltip.row.engagement.toFixed(2)}%
                </p>
                <p className="text-xs">
                  Total Views: {formatNumber(tooltip.row.totalViews)}
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
export function CreatorProfilesTab({ data }: { data: DashboardData }) {
  const { creators, videoStats } = data

  // ── Build radar profiles for all creators ──
  const radarProfiles = useMemo<CreatorRadarProfile[]>(() => {
    return creators.map((c: CreatorFull) => ({
      channelId: c.channelId,
      title: c.title,
      color: getCreatorColor(c.channelId),
      data: buildRadarData(c, creators, videoStats),
    }))
  }, [creators, videoStats])

  // ── 3.2 Comparison: default to first 3 creators ──
  const defaultSelected = useMemo(
    () => creators.slice(0, 3).map((c: CreatorFull) => c.channelId),
    [creators],
  )
  const [selectedIds, setSelectedIds] = useState<string[]>(defaultSelected)

  // Sync default when creators change
  useEffect(() => {
    setSelectedIds(creators.slice(0, 3).map((c: CreatorFull) => c.channelId))
  }, [creators])

  const creatorOptions = useMemo<MultiSelectOption[]>(
    () =>
      creators.map((c: CreatorFull) => ({
        value: c.channelId,
        label: c.title,
      })),
    [creators],
  )

  const selectedProfiles = useMemo(
    () => radarProfiles.filter((p) => selectedIds.includes(p.channelId)),
    [radarProfiles, selectedIds],
  )

  // ── 3.3 Threat matrix scatter data ──
  const threatData = useMemo<ThreatDatum[]>(() => {
    return creators
      .map((c: CreatorFull) => {
        const stats = videoStats.get(c.channelId)
        const subs = toNum(c.subscribers)
        const eng = stats?.avgEngagement ?? 0
        const views = toNum(c.totalViews)
        const threat = c.competitiveThreat ?? "Low"
        return {
          name: c.title,
          subscribers: subs,
          engagement: eng,
          totalViews: views,
          threat,
        }
      })
      .filter((d: ThreatDatum) => d.subscribers > 0)
  }, [creators, videoStats])

  // ── Render ──
  if (creators.length === 0) {
    return (
      <p className="text-muted-foreground">No creator data available.</p>
    )
  }

  return (
    <div className="space-y-8">
      {/* ── 3.2 Creator Comparison (large overlaid radar) ── */}
      <div className="rounded-lg border p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <h3 className="text-sm font-semibold">Creator Comparison</h3>
          <MultiSelectDropdown
            options={creatorOptions}
            selected={selectedIds}
            onChange={setSelectedIds}
            maxSelections={5}
          />
        </div>

        {selectedIds.length < 2 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Select at least 2 creators to compare.
          </p>
        ) : (
          <ComparisonRadarChart profiles={selectedProfiles} />
        )}
      </div>

      {/* ── 3.1 Radar Chart Grid ── */}
      <div className="rounded-lg border p-5">
        <h3 className="text-sm font-semibold mb-4">
          Individual Creator Profiles
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {radarProfiles.map((profile) => (
            <div key={profile.channelId} className="rounded-lg border p-4">
              <p className="text-xs font-medium truncate mb-2">
                {profile.title}
              </p>
              <SmallRadarChart profile={profile} />
            </div>
          ))}
        </div>
      </div>

      {/* ── 3.3 Competitive Threat Matrix ── */}
      <div className="rounded-lg border p-5">
        <h3 className="text-sm font-semibold mb-4">
          Competitive Threat Matrix
        </h3>
        {threatData.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No threat data available.
          </p>
        ) : (
          <>
            <ThreatScatterChart data={threatData} />
            <ThreatLegend />
          </>
        )}
      </div>
    </div>
  )
}
