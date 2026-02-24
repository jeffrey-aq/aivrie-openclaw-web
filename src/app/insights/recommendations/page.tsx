"use client"

import { useEffect, useMemo, useState } from "react"
import { gql } from "graphql-request"
import { extractNodes } from "@/lib/graphql"
import { useGraphQLClient } from "@/hooks/use-graphql"
import { PageHeader } from "@/components/page-header"
import { ArrowUp, ArrowDown, ArrowUpDown, X, WrapText } from "lucide-react"
import {
  ImpactLevelBadge,
  EffortLevelBadge,
  UrgencyLevelBadge,
  RecommendationStatusBadge,
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

interface Recommendation {
  id: string
  runId: string | null
  number: number
  title: string
  description: string
  impact: string
  effort: string
  urgency: string
  category: string | null
  experts: string[] | null
  supportingData: unknown | null
  confidenceScore: number | null
  isContradiction: boolean
  contradictingViews: string | null
  status: string
  feedback: string | null
  feedbackAt: string | null
  deepDiveRequested: boolean
  deepDiveContent: string | null
  deepDiveAt: string | null
  createdAt: string
  updatedAt: string | null
}

const RECOMMENDATIONS_QUERY = gql`
  query {
    recommendationsCollection(
      orderBy: [{ createdAt: DescNullsLast }]
      first: 100
    ) {
      edges {
        node {
          id
          runId
          number
          title
          description
          impact
          effort
          urgency
          category
          experts
          supportingData
          confidenceScore
          isContradiction
          contradictingViews
          status
          feedback
          feedbackAt
          deepDiveRequested
          deepDiveContent
          deepDiveAt
          createdAt
          updatedAt
        }
      }
    }
  }
`

// --- Enum option lists for filters ---
const impactOptions = ["high", "medium", "low"]
const effortOptions = ["hours", "days", "weeks", "months"]
const urgencyOptions = ["now", "soon", "later"]
const statusOptions = ["pending", "approved", "rejected", "implemented", "cancelled"]

// --- Formatting helpers ---
function formatDate(d: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

function truncate(s: string | null, max: number) {
  if (!s) return "—"
  return s.length > max ? s.slice(0, max) + "…" : s
}

function formatConfidence(n: number | null) {
  if (n == null) return "—"
  return `${Math.round(n * 100)}%`
}

// --- Sort order maps ---
const impactOrder: Record<string, number> = { high: 2, medium: 1, low: 0 }
const effortOrder: Record<string, number> = { hours: 0, days: 1, weeks: 2, months: 3 }
const urgencyOrder: Record<string, number> = { now: 2, soon: 1, later: 0 }
const statusOrder: Record<string, number> = { pending: 0, approved: 1, rejected: 2, implemented: 3, cancelled: 4 }

// --- Sort / Filter types ---
type SortDir = "asc" | "desc"
type SortKey = keyof Recommendation

interface Filters {
  search: string
  impact: string
  effort: string
  urgency: string
  status: string
}

const emptyFilters: Filters = {
  search: "",
  impact: "",
  effort: "",
  urgency: "",
  status: "",
}

function compareValues(a: unknown, b: unknown, key: SortKey): number {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  if (key === "impact") return (impactOrder[a as string] ?? -1) - (impactOrder[b as string] ?? -1)
  if (key === "effort") return (effortOrder[a as string] ?? -1) - (effortOrder[b as string] ?? -1)
  if (key === "urgency") return (urgencyOrder[a as string] ?? -1) - (urgencyOrder[b as string] ?? -1)
  if (key === "status") return (statusOrder[a as string] ?? -1) - (statusOrder[b as string] ?? -1)
  if (typeof a === "boolean" && typeof b === "boolean") return (a === b ? 0 : a ? -1 : 1)
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

export default function RecommendationsPage() {
  const graphqlClient = useGraphQLClient()
  const [items, setItems] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [wrapText, setWrapText] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const data = await graphqlClient.request<{
          recommendationsCollection: { edges: { node: Recommendation }[] }
        }>(RECOMMENDATIONS_QUERY)
        setItems(extractNodes(data.recommendationsCollection))
      } catch (error) {
        console.error("Error loading recommendations:", error)
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
    let result = items
    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.description?.toLowerCase().includes(q) ||
          r.category?.toLowerCase().includes(q)
      )
    }
    if (filters.impact) result = result.filter((r) => r.impact === filters.impact)
    if (filters.effort) result = result.filter((r) => r.effort === filters.effort)
    if (filters.urgency) result = result.filter((r) => r.urgency === filters.urgency)
    if (filters.status) result = result.filter((r) => r.status === filters.status)
    return result
  }, [items, filters])

  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    return [...filtered].sort((a, b) => {
      const cmp = compareValues(a[sortKey], b[sortKey], sortKey)
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  return (
    <>
      <PageHeader section="Insights" sectionHref="/insights/recommendations" page="Recommendations" />
      <div className="flex-1 p-6">
        <h1 className="text-2xl font-semibold mb-4">Recommendations</h1>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Input
            placeholder="Search title, description, category..."
            value={filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
            className="h-8 w-[280px] text-xs"
          />
          <FilterSelect label="Impact" value={filters.impact} options={impactOptions} onChange={(v) => setFilter("impact", v)} />
          <FilterSelect label="Effort" value={filters.effort} options={effortOptions} onChange={(v) => setFilter("effort", v)} />
          <FilterSelect label="Urgency" value={filters.urgency} options={urgencyOptions} onChange={(v) => setFilter("urgency", v)} />
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
              {sorted.length} of {items.length} recommendations
            </span>
          </div>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground">No recommendations found.</p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead label="#" sortKey="number" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="w-10" />
                  <SortableHead label="Title" sortKey="title" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Description" sortKey="description" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Category" sortKey="category" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Impact" sortKey="impact" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Effort" sortKey="effort" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Urgency" sortKey="urgency" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Confidence" sortKey="confidenceScore" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
                  <SortableHead label="Status" sortKey="status" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Contradiction" sortKey="isContradiction" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Created" sortKey="createdAt" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Updated" sortKey="updatedAt" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.number}</TableCell>
                    <TableCell className="font-medium min-w-[180px]">
                      <span className={wrapText ? "" : "line-clamp-2"}>{r.title}</span>
                    </TableCell>
                    <TableCell className={wrapText ? "min-w-[300px] text-xs" : "max-w-[300px]"}>
                      <span className={wrapText ? "" : "line-clamp-2 text-xs"}>{wrapText ? (r.description || "—") : truncate(r.description, 80)}</span>
                    </TableCell>
                    <TableCell>{r.category || "—"}</TableCell>
                    <TableCell><ImpactLevelBadge value={r.impact} /></TableCell>
                    <TableCell><EffortLevelBadge value={r.effort} /></TableCell>
                    <TableCell><UrgencyLevelBadge value={r.urgency} /></TableCell>
                    <TableCell className="text-right">{formatConfidence(r.confidenceScore)}</TableCell>
                    <TableCell><RecommendationStatusBadge value={r.status} /></TableCell>
                    <TableCell>{r.isContradiction ? "Yes" : "No"}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(r.createdAt)}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(r.updatedAt)}</TableCell>
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
