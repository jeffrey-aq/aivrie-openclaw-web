"use client"

import { useMemo, useState, useRef, useEffect, useCallback } from "react"
import type { ReactElement } from "react"
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Cell,
  LabelList,
} from "recharts"
import type { LabelProps } from "recharts"
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

// ─── Custom threat legend (since recharts v3 Legend doesn't accept custom payload) ─
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

// ─── Custom scatter label renderer ──────────────────────────────────────────
function renderScatterLabel(props: LabelProps): ReactElement | string {
  const x = props.x as number | undefined
  const y = props.y as number | undefined
  const value = props.value as string | number | undefined
  if (x == null || y == null) return ""
  return (
    <text
      x={x}
      y={Number(y) - 12}
      textAnchor="middle"
      fontSize={10}
      fill="currentColor"
      className="fill-foreground"
    >
      {value}
    </text>
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

  // ── Merged radar data for comparison chart (one entry per axis with keys per creator) ──
  const comparisonData = useMemo(() => {
    const selectedProfiles = radarProfiles.filter((p) =>
      selectedIds.includes(p.channelId),
    )
    return RADAR_AXES.map((axis) => {
      const entry: Record<string, string | number> = { axis }
      for (const profile of selectedProfiles) {
        const datum = profile.data.find((d: RadarDatum) => d.axis === axis)
        entry[profile.channelId] = datum?.value ?? 0
      }
      return entry
    })
  }, [radarProfiles, selectedIds])

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
      {/* ── 3.2 Creator Comparison (large RadarChart) ── */}
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
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart outerRadius={120} data={comparisonData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={false}
                axisLine={false}
              />
              {selectedProfiles.map((profile) => (
                <Radar
                  key={profile.channelId}
                  name={profile.title}
                  dataKey={profile.channelId}
                  stroke={profile.color}
                  fill={profile.color}
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              ))}
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(value: unknown) => [
                  `${Math.round(Number(value))}`,
                  undefined,
                ]}
              />
              <Legend wrapperStyle={{ fontSize: "0.75rem" }} />
            </RadarChart>
          </ResponsiveContainer>
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
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart outerRadius={60} data={profile.data}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="axis" tick={{ fontSize: 8 }} />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 100]}
                    tick={false}
                    axisLine={false}
                  />
                  <Radar
                    dataKey="value"
                    stroke={profile.color}
                    fill={profile.color}
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(value: unknown) => [
                      `${Math.round(Number(value))}`,
                      undefined,
                    ]}
                  />
                </RadarChart>
              </ResponsiveContainer>
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
            <ResponsiveContainer width="100%" height={450}>
              <ScatterChart
                margin={{ top: 20, right: 30, bottom: 20, left: 20 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="opacity-30"
                />
                <XAxis
                  type="number"
                  dataKey="subscribers"
                  name="Subscribers"
                  scale="log"
                  domain={["auto", "auto"]}
                  tickFormatter={(v: number) => formatNumber(v)}
                  tick={{ fontSize: 11 }}
                  label={{
                    value: "Subscribers (log scale)",
                    position: "insideBottom",
                    offset: -10,
                    style: { fontSize: 11 },
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="engagement"
                  name="Avg Engagement %"
                  tick={{ fontSize: 11 }}
                  label={{
                    value: "Avg Engagement %",
                    angle: -90,
                    position: "insideLeft",
                    offset: 0,
                    style: { fontSize: 11 },
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
                  formatter={(value: unknown, name: unknown) => {
                    const v = Number(value)
                    const n = String(name)
                    if (n === "Subscribers") return [formatNumber(v), n]
                    if (n === "Total Views") return [formatNumber(v), n]
                    return [`${v.toFixed(2)}%`, n]
                  }}
                  labelFormatter={(
                    _label: unknown,
                    payload: ReadonlyArray<{ payload?: Record<string, unknown> }>,
                  ) => {
                    const item = payload?.[0]?.payload as
                      | ThreatDatum
                      | undefined
                    return item
                      ? `${item.name} (${item.threat} Threat)`
                      : ""
                  }}
                />
                <Scatter data={threatData} name="Creators">
                  {threatData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        THREAT_COLORS[entry.threat] ?? THREAT_COLORS.Low
                      }
                      fillOpacity={0.7}
                      stroke={
                        THREAT_COLORS[entry.threat] ?? THREAT_COLORS.Low
                      }
                      strokeWidth={1}
                    />
                  ))}
                  <LabelList
                    dataKey="name"
                    content={renderScatterLabel}
                  />
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
            <ThreatLegend />
          </>
        )}
      </div>
    </div>
  )
}
