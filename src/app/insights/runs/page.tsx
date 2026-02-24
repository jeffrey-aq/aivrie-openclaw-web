"use client"

import { useEffect, useMemo, useState } from "react"
import { gql } from "graphql-request"
import { extractNodes } from "@/lib/graphql"
import { useGraphQLClient } from "@/hooks/use-graphql"
import { PageHeader } from "@/components/page-header"
import { ArrowUp, ArrowDown, ArrowUpDown, X, WrapText } from "lucide-react"
import { RunStatusBadge } from "@/components/enum-badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"

interface AnalysisRun {
  id: string
  runDate: string
  status: string
  dataWindowStart: string | null
  dataWindowEnd: string | null
  sourcesCollected: string[] | null
  specialistsSpawned: number
  specialistsCompleted: number
  recommendationsGenerated: number
  digestSentAt: string | null
  startedAt: string | null
  completedAt: string | null
  durationSeconds: number | null
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}

const RUNS_QUERY = gql`
  query {
    analysisRunsCollection(
      orderBy: [{ runDate: DescNullsLast }]
      first: 50
    ) {
      edges {
        node {
          id
          runDate
          status
          dataWindowStart
          dataWindowEnd
          sourcesCollected
          specialistsSpawned
          specialistsCompleted
          recommendationsGenerated
          digestSentAt
          startedAt
          completedAt
          durationSeconds
          errorMessage
          createdAt
          updatedAt
        }
      }
    }
  }
`

// --- Enum option lists for filters ---
const statusOptions = ["running", "completed", "failed", "cancelled"]

// --- Formatting helpers ---
function formatDate(d: string | null) {
  if (!d) return "\u2014"
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

function formatDateTime(d: string | null) {
  if (!d) return "\u2014"
  return new Date(d).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
}

function truncate(s: string | null, max: number) {
  if (!s) return "\u2014"
  return s.length > max ? s.slice(0, max) + "\u2026" : s
}

// --- Sort / Filter types ---
type SortDir = "asc" | "desc"
type SortKey = keyof AnalysisRun

interface Filters {
  search: string
  status: string
}

const emptyFilters: Filters = {
  search: "",
  status: "",
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

export default function RunsPage() {
  const graphqlClient = useGraphQLClient()
  const [runs, setRuns] = useState<AnalysisRun[]>([])
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [wrapText, setWrapText] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const data = await graphqlClient.request<{
          analysisRunsCollection: { edges: { node: AnalysisRun }[] }
        }>(RUNS_QUERY)
        setRuns(extractNodes(data.analysisRunsCollection))
      } catch (error) {
        console.error("Error loading runs:", error)
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
    let result = runs
    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter(
        (r) => r.errorMessage?.toLowerCase().includes(q)
      )
    }
    if (filters.status) result = result.filter((r) => r.status === filters.status)
    return result
  }, [runs, filters])

  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    return [...filtered].sort((a, b) => {
      const cmp = compareValues(a[sortKey], b[sortKey], sortKey)
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  return (
    <>
      <PageHeader section="Insights" sectionHref="/insights/recommendations" page="Analysis Runs" />
      <div className="flex-1 p-6">
        <h1 className="text-2xl font-semibold mb-4">Analysis Runs</h1>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Input
            placeholder="Search errors..."
            value={filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
            className="h-8 w-[200px] text-xs"
          />
          <FilterSelect label="Status" value={filters.status} options={statusOptions} onChange={(v) => setFilter("status", v)} />
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
              {sorted.length} of {runs.length} runs
            </span>
          </div>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : runs.length === 0 ? (
          <p className="text-muted-foreground">No analysis runs found.</p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead label="Date" sortKey="runDate" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Status" sortKey="status" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Specialists" sortKey="specialistsCompleted" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
                  <SortableHead label="Recommendations" sortKey="recommendationsGenerated" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
                  <SortableHead label="Duration" sortKey="durationSeconds" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
                  <SortableHead label="Error" sortKey="errorMessage" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Created" sortKey="createdAt" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Updated" sortKey="updatedAt" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium whitespace-nowrap">{formatDate(r.runDate)}</TableCell>
                    <TableCell><RunStatusBadge value={r.status} /></TableCell>
                    <TableCell className="text-right">{r.specialistsCompleted}/{r.specialistsSpawned}</TableCell>
                    <TableCell className="text-right">{r.recommendationsGenerated}</TableCell>
                    <TableCell className="text-right">
                      {r.durationSeconds != null ? `${r.durationSeconds}s` : "\u2014"}
                    </TableCell>
                    <TableCell className={wrapText ? "min-w-[250px] text-xs text-muted-foreground" : "max-w-[200px] text-muted-foreground"}>
                      <span className={wrapText ? "" : "line-clamp-2 text-xs"}>
                        {wrapText ? (r.errorMessage || "\u2014") : truncate(r.errorMessage, 60)}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{formatDateTime(r.createdAt)}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDateTime(r.updatedAt)}</TableCell>
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
