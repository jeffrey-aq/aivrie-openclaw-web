"use client"

import { useEffect, useMemo, useState } from "react"
import { gql } from "graphql-request"
import { extractNodes } from "@/lib/graphql"
import { useGraphQLClient } from "@/hooks/use-graphql"
import { PageHeader } from "@/components/page-header"
import { ArrowUp, ArrowDown, ArrowUpDown, X, WrapText } from "lucide-react"
import {
  AggregationTypeBadge,
  TimePeriodBadge,
} from "@/components/enum-badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"

interface AggregatedMetric {
  id: string
  metricName: string
  aggregationType: string
  period: string
  periodStart: string
  periodEnd: string
  value: number
  sampleCount: number | null
  dimension1: string | null
  dimension2: string | null
  createdAt: string
  updatedAt: string
}

const METRICS_QUERY = gql`
  query {
    aggregatedMetricsCollection(
      orderBy: [{ periodStart: DescNullsLast }]
      first: 100
    ) {
      edges {
        node {
          id
          metricName
          aggregationType
          period
          periodStart
          periodEnd
          value
          sampleCount
          dimension1
          dimension2
          createdAt
          updatedAt
        }
      }
    }
  }
`

// --- Enum option lists for filters ---
const aggregationTypeOptions = ["sum", "avg", "min", "max", "count", "median", "p95", "p99"]
const periodOptions = ["hourly", "daily", "weekly", "monthly", "quarterly"]

// --- Formatting helpers ---
function formatNumber(n: number | null) {
  if (n == null) return "—"
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toLocaleString()
}

function formatDate(d: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

// --- Sort / Filter types ---
type SortDir = "asc" | "desc"
type SortKey = keyof AggregatedMetric

interface Filters {
  search: string
  aggregationType: string
  period: string
}

const emptyFilters: Filters = {
  search: "",
  aggregationType: "",
  period: "",
}

function compareValues(a: unknown, b: unknown, _key: SortKey): number {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  if (typeof a === "number" && typeof b === "number") return a - b
  if (typeof a === "string" && typeof b === "string") return a.localeCompare(b)
  return 0
}

// --- Filter select component ---
function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  onChange: (v: string) => void
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground min-w-[100px]"
    >
      <option value="">{label}</option>
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  )
}

// --- Sortable header ---
function SortableHead({
  label,
  sortKey,
  currentSort,
  currentDir,
  onSort,
  className,
}: {
  label: string
  sortKey: SortKey
  currentSort: SortKey | null
  currentDir: SortDir
  onSort: (key: SortKey) => void
  className?: string
}) {
  const active = currentSort === sortKey
  return (
    <TableHead
      className={`cursor-pointer select-none hover:bg-muted/50 transition-colors ${className || ""}`}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        {active ? (
          currentDir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />
        ) : (
          <ArrowUpDown className="size-3 opacity-30" />
        )}
      </div>
    </TableHead>
  )
}

export default function MetricsPage() {
  const graphqlClient = useGraphQLClient()
  const [metrics, setMetrics] = useState<AggregatedMetric[]>([])
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [wrapText, setWrapText] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const data = await graphqlClient.request<{
          aggregatedMetricsCollection: { edges: { node: AggregatedMetric }[] }
        }>(METRICS_QUERY)
        setMetrics(extractNodes(data.aggregatedMetricsCollection))
      } catch (error) {
        console.error("Error loading metrics:", error)
      }
      setLoading(false)
    }
    load()
  }, [graphqlClient])

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  function setFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((f) => ({ ...f, [key]: value }))
  }

  const hasFilters = Object.values(filters).some((v) => v !== "")

  const filtered = useMemo(() => {
    let result = metrics
    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter(
        (m) =>
          m.metricName.toLowerCase().includes(q) ||
          m.dimension1?.toLowerCase().includes(q)
      )
    }
    if (filters.aggregationType) result = result.filter((m) => m.aggregationType === filters.aggregationType)
    if (filters.period) result = result.filter((m) => m.period === filters.period)
    return result
  }, [metrics, filters])

  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    return [...filtered].sort((a, b) => {
      const cmp = compareValues(a[sortKey], b[sortKey], sortKey)
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  return (
    <>
      <PageHeader section="Insights" sectionHref="/insights/recommendations" page="Metrics" />
      <div className="flex-1 p-6">
        <h1 className="text-2xl font-semibold mb-4">Aggregated Metrics</h1>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Input
            placeholder="Search metrics..."
            value={filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
            className="h-8 w-[200px] text-xs"
          />
          <FilterSelect label="Aggregation" value={filters.aggregationType} options={aggregationTypeOptions} onChange={(v) => setFilter("aggregationType", v)} />
          <FilterSelect label="Period" value={filters.period} options={periodOptions} onChange={(v) => setFilter("period", v)} />
          {hasFilters && (
            <button
              onClick={() => setFilters(emptyFilters)}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <X className="size-3" />
              Clear
            </button>
          )}
          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={() => setWrapText((w) => !w)}
              className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors ${wrapText ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
            >
              <WrapText className="size-3" />
              Wrap
            </button>
            <span className="text-xs text-muted-foreground">
              {sorted.length} of {metrics.length} metrics
            </span>
          </div>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : metrics.length === 0 ? (
          <p className="text-muted-foreground">No metrics found.</p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead label="Metric" sortKey="metricName" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="sticky left-0 bg-background z-10" />
                  <SortableHead label="Aggregation" sortKey="aggregationType" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Period" sortKey="period" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Start" sortKey="periodStart" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Value" sortKey="value" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
                  <SortableHead label="Samples" sortKey="sampleCount" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
                  <SortableHead label="Dimension" sortKey="dimension1" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Created" sortKey="createdAt" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Updated" sortKey="updatedAt" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium sticky left-0 bg-background z-10 min-w-[180px]">{m.metricName}</TableCell>
                    <TableCell><AggregationTypeBadge value={m.aggregationType} /></TableCell>
                    <TableCell><TimePeriodBadge value={m.period} /></TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(m.periodStart)}</TableCell>
                    <TableCell className="text-right">{formatNumber(m.value)}</TableCell>
                    <TableCell className="text-right">{m.sampleCount != null ? m.sampleCount.toLocaleString() : "—"}</TableCell>
                    <TableCell className={wrapText ? "min-w-[200px]" : "max-w-[200px] truncate"}>{m.dimension1 || "—"}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(m.createdAt)}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(m.updatedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </>
  )
}
