"use client"

import { useEffect, useMemo, useState } from "react"
import { gql } from "graphql-request"
import { extractNodes } from "@/lib/graphql"
import { useGraphQLClient } from "@/hooks/use-graphql"
import { PageHeader } from "@/components/page-header"
import { ArrowUp, ArrowDown, ArrowUpDown, X, WrapText } from "lucide-react"
import {
  FeedbackActionBadge,
  ImpactLevelBadge,
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

interface FeedbackEvent {
  id: string
  recommendationId: string | null
  action: string
  reason: string | null
  recommendationType: string | null
  impactLevel: string | null
  effortLevel: string | null
  expertsInvolved: string[] | null
  wasSuccessful: boolean | null
  outcomeNotes: string | null
  createdAt: string
  updatedAt: string | null
}

const FEEDBACK_QUERY = gql`
  query {
    feedbackEventsCollection(
      orderBy: [{ createdAt: DescNullsLast }]
      first: 100
    ) {
      edges {
        node {
          id
          recommendationId
          action
          reason
          recommendationType
          impactLevel
          effortLevel
          expertsInvolved
          wasSuccessful
          outcomeNotes
          createdAt
          updatedAt
        }
      }
    }
  }
`

// --- Enum option lists for filters ---
const actionOptions = ["approved", "rejected", "implemented", "deep_dive", "cancelled"]
const impactLevelOptions = ["high", "medium", "low"]

// --- Formatting helpers ---
function formatDate(d: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

function truncate(s: string | null, max: number) {
  if (!s) return "—"
  return s.length > max ? s.slice(0, max) + "…" : s
}

// --- Sort / Filter types ---
type SortDir = "asc" | "desc"
type SortKey = keyof FeedbackEvent

interface Filters {
  search: string
  action: string
  impactLevel: string
}

const emptyFilters: Filters = {
  search: "",
  action: "",
  impactLevel: "",
}

function compareValues(a: unknown, b: unknown, _key: SortKey): number {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
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

export default function FeedbackPage() {
  const graphqlClient = useGraphQLClient()
  const [events, setEvents] = useState<FeedbackEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [wrapText, setWrapText] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const data = await graphqlClient.request<{
          feedbackEventsCollection: { edges: { node: FeedbackEvent }[] }
        }>(FEEDBACK_QUERY)
        setEvents(extractNodes(data.feedbackEventsCollection))
      } catch (error) {
        console.error("Error loading feedback:", error)
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
    let result = events
    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter(
        (e) =>
          e.reason?.toLowerCase().includes(q) ||
          e.recommendationType?.toLowerCase().includes(q) ||
          e.outcomeNotes?.toLowerCase().includes(q)
      )
    }
    if (filters.action) result = result.filter((e) => e.action === filters.action)
    if (filters.impactLevel) result = result.filter((e) => e.impactLevel === filters.impactLevel)
    return result
  }, [events, filters])

  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    return [...filtered].sort((a, b) => {
      const cmp = compareValues(a[sortKey], b[sortKey], sortKey)
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  return (
    <>
      <PageHeader section="Insights" sectionHref="/insights/recommendations" page="Feedback" />
      <div className="flex-1 p-6">
        <h1 className="text-2xl font-semibold mb-4">Feedback Events</h1>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Input
            placeholder="Search feedback..."
            value={filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
            className="h-8 w-[200px] text-xs"
          />
          <FilterSelect label="Action" value={filters.action} options={actionOptions} onChange={(v) => setFilter("action", v)} />
          <FilterSelect label="Impact" value={filters.impactLevel} options={impactLevelOptions} onChange={(v) => setFilter("impactLevel", v)} />
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
              {sorted.length} of {events.length} events
            </span>
          </div>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : events.length === 0 ? (
          <p className="text-muted-foreground">No feedback events found.</p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead label="Action" sortKey="action" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Type" sortKey="recommendationType" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Impact" sortKey="impactLevel" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Reason" sortKey="reason" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Successful" sortKey="wasSuccessful" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Outcome" sortKey="outcomeNotes" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Created" sortKey="createdAt" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Updated" sortKey="updatedAt" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell><FeedbackActionBadge value={e.action} /></TableCell>
                    <TableCell>{e.recommendationType || "—"}</TableCell>
                    <TableCell><ImpactLevelBadge value={e.impactLevel} /></TableCell>
                    <TableCell className={wrapText ? "min-w-[250px] text-xs" : "max-w-[200px]"}>
                      <span className={wrapText ? "" : "line-clamp-2 text-xs"}>{wrapText ? (e.reason || "—") : truncate(e.reason, 60)}</span>
                    </TableCell>
                    <TableCell>
                      {e.wasSuccessful == null ? "—" : e.wasSuccessful ? "Yes" : "No"}
                    </TableCell>
                    <TableCell className={wrapText ? "min-w-[250px] text-xs" : "max-w-[200px]"}>
                      <span className={wrapText ? "" : "line-clamp-2 text-xs"}>{wrapText ? (e.outcomeNotes || "—") : truncate(e.outcomeNotes, 60)}</span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(e.createdAt)}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(e.updatedAt)}</TableCell>
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
