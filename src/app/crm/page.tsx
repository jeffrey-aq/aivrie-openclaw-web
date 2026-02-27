"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { gql } from "graphql-request"
import { extractNodes } from "@/lib/graphql"
import { useGraphQLClient } from "@/hooks/use-graphql"
import { PageHeader } from "@/components/page-header"
import { Users, MessageSquare, Clock } from "lucide-react"
import { scaleBand, scaleLinear } from "d3-scale"
import { axisBottom, axisLeft } from "d3-axis"
import { max } from "d3-array"
import { useChartDimensions } from "@/components/research/d3/use-chart-dimensions"
import { useD3Axis } from "@/components/research/d3/use-d3-axis"
import { ChartGrid } from "@/components/research/d3/grid"
import { ChartTooltip } from "@/components/research/d3/tooltip"
import { ChartLegend } from "@/components/research/d3/legend"

interface TimestampedRow {
  createdAt: string
  updatedAt: string
}

interface CrmDashboardData {
  contactsCollection: { edges: { node: TimestampedRow }[] }
  interactionsCollection: { edges: { node: TimestampedRow }[] }
  followUpsCollection: { edges: { node: TimestampedRow }[] }
}

const DASHBOARD_QUERY = gql`
  query {
    contactsCollection(first: 1000) {
      edges { node { createdAt updatedAt } }
    }
    interactionsCollection(first: 1000) {
      edges { node { createdAt updatedAt } }
    }
    followUpsCollection(first: 1000) {
      edges { node { createdAt updatedAt } }
    }
  }
`

function getWeekLabel(date: Date): string {
  const start = new Date(date)
  start.setDate(start.getDate() - start.getDay())
  return start.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function getWeekKey(date: Date): string {
  const start = new Date(date)
  start.setDate(start.getDate() - start.getDay())
  return start.toISOString().slice(0, 10)
}

function aggregateByWeek(rows: TimestampedRow[], weeks: string[]) {
  const created: Record<string, number> = {}
  const modified: Record<string, number> = {}
  weeks.forEach((w) => { created[w] = 0; modified[w] = 0 })

  rows.forEach((r) => {
    const ck = getWeekKey(new Date(r.createdAt))
    if (created[ck] !== undefined) created[ck]++

    if (r.updatedAt && r.updatedAt !== r.createdAt) {
      const uk = getWeekKey(new Date(r.updatedAt))
      if (modified[uk] !== undefined) modified[uk]++
    }
  })

  return weeks.map((w) => ({
    week: getWeekLabel(new Date(w)),
    Created: created[w],
    Modified: modified[w],
  }))
}

function getLast8Weeks(): string[] {
  const weeks: string[] = []
  const now = new Date()
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i * 7)
    weeks.push(getWeekKey(d))
  }
  return weeks
}

export default function CrmDashboard() {
  const graphqlClient = useGraphQLClient()
  const [data, setData] = useState<CrmDashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const result = await graphqlClient.request<CrmDashboardData>(DASHBOARD_QUERY)
        setData(result)
      } catch (error) {
        console.error("Error loading CRM dashboard:", error)
      }
      setLoading(false)
    }
    load()
  }, [graphqlClient])

  const weeks = useMemo(() => getLast8Weeks(), [])

  const contacts = useMemo(() => data ? extractNodes(data.contactsCollection) : [], [data])
  const interactions = useMemo(() => data ? extractNodes(data.interactionsCollection) : [], [data])
  const followUps = useMemo(() => data ? extractNodes(data.followUpsCollection) : [], [data])

  const contactsChart = useMemo(() => aggregateByWeek(contacts, weeks), [contacts, weeks])
  const interactionsChart = useMemo(() => aggregateByWeek(interactions, weeks), [interactions, weeks])
  const followUpsChart = useMemo(() => aggregateByWeek(followUps, weeks), [followUps, weeks])

  const summaryCards = [
    { label: "Contacts", count: contacts.length, icon: Users, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950", href: "/crm/contacts" },
    { label: "Interactions", count: interactions.length, icon: MessageSquare, color: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-950", href: "/crm/interactions" },
    { label: "Follow-ups", count: followUps.length, icon: Clock, color: "text-violet-500", bg: "bg-violet-50 dark:bg-violet-950", href: "/crm/follow-ups" },
  ]

  return (
    <>
      <PageHeader section="CRM" sectionHref="/crm" page="Dashboard" />
      <div className="flex-1 p-6">
        <h1 className="text-2xl font-semibold mb-6">CRM Dashboard</h1>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : !data ? (
          <p className="text-muted-foreground">Failed to load dashboard data.</p>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid gap-4 md:grid-cols-3 mb-8">
              {summaryCards.map((card) => (
                <Link
                  key={card.label}
                  href={card.href}
                  className={`rounded-lg border p-5 ${card.bg} hover:shadow-md transition-shadow`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <card.icon className={`size-5 ${card.color}`} />
                      <span className="font-medium">{card.label}</span>
                    </div>
                    <span className="text-2xl font-bold">{card.count.toLocaleString()}</span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Activity charts */}
            <div className="grid gap-6 lg:grid-cols-1">
              <ActivityChart title="Contacts Activity" data={contactsChart} color="#3b82f6" />
              <ActivityChart title="Interactions Activity" data={interactionsChart} color="#6366f1" />
              <ActivityChart title="Follow-ups Activity" data={followUpsChart} color="#8b5cf6" />
            </div>
          </>
        )}
      </div>
    </>
  )
}

function ActivityChart({
  title,
  data,
  color,
}: {
  title: string
  data: { week: string; Created: number; Modified: number }[]
  color: string
}) {
  const margin = { top: 10, right: 20, bottom: 30, left: 50 }
  const HEIGHT = 200
  const [ref, dims] = useChartDimensions(margin)
  const [tooltip, setTooltip] = useState<{
    x: number
    y: number
    row: (typeof data)[0]
  } | null>(null)

  const SERIES = [
    { key: "Created" as const, label: "Created", fill: color },
    { key: "Modified" as const, label: "Modified", fill: `${color}80` },
  ]

  const xScale = useMemo(
    () =>
      scaleBand<string>()
        .domain(data.map((d) => d.week))
        .range([0, dims.innerWidth])
        .padding(0.2),
    [data, dims.innerWidth],
  )

  const xInner = useMemo(
    () =>
      scaleBand<string>()
        .domain(SERIES.map((s) => s.key))
        .range([0, xScale.bandwidth()])
        .padding(0.05),
    [xScale],
  )

  const maxVal = useMemo(
    () => max(data.flatMap((d) => [d.Created, d.Modified])) ?? 0,
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
        ? axisLeft(yScale).ticks(Math.min(maxVal, 5))
        : null,
    [yScale, dims.innerHeight, maxVal],
  )

  const xAxisRef = useD3Axis(xAxis)
  const yAxisRef = useD3Axis(yAxis)

  const handleMouse = (e: React.MouseEvent, row: (typeof data)[0]) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, row })
  }

  return (
    <div className="rounded-lg border p-5">
      <h3 className="text-sm font-semibold mb-4">{title}</h3>
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
                    key={d.week}
                    transform={`translate(${xScale(d.week) ?? 0},0)`}
                  >
                    {SERIES.map((s) => {
                      const val = d[s.key]
                      return (
                        <rect
                          key={s.key}
                          x={xInner(s.key) ?? 0}
                          y={yScale(val)}
                          width={xInner.bandwidth()}
                          height={Math.max(0, dims.innerHeight - yScale(val))}
                          fill={s.fill}
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
                    {tooltip.row.week}
                  </p>
                  <p className="text-xs">Created: {tooltip.row.Created}</p>
                  <p className="text-xs">Modified: {tooltip.row.Modified}</p>
                </>
              )}
            </ChartTooltip>
          </>
        )}
      </div>
      <ChartLegend
        entries={SERIES.map((s) => ({ label: s.label, color: s.fill }))}
        className="mt-2"
      />
    </div>
  )
}
