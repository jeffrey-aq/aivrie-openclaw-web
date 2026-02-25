"use client"

import { useEffect, useMemo, useState } from "react"
import { gql } from "graphql-request"
import { extractNodes } from "@/lib/graphql"
import { useGraphQLClient } from "@/hooks/use-graphql"
import { PageHeader } from "@/components/page-header"
import { ArrowUp, ArrowDown, ArrowUpDown, X } from "lucide-react"
import { SourceCategoryBadge } from "@/components/enum-badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"

interface DataSource {
  id: string
  name: string
  displayName: string
  category: string
  apiEndpoint: string | null
  lastSyncAt: string | null
  syncFrequencyHours: number
  isActive: boolean
  config: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

const DATA_SOURCES_QUERY = gql`
  query {
    dataSourcesCollection(orderBy: [{ category: AscNullsLast }], first: 1000) {
      edges {
        node {
          id
          name
          displayName
          category
          apiEndpoint
          lastSyncAt
          syncFrequencyHours
          isActive
          config
          createdAt
          updatedAt
        }
      }
    }
  }
`

// --- Enum option lists for filters ---
const categoryOptions = ["content", "sales", "operations", "engagement", "communication"]
const activeOptions = ["Active", "Inactive"]

// --- Formatting helpers ---
function formatDate(d: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

// --- Sort / Filter types ---
type SortDir = "asc" | "desc"
type SortKey = keyof DataSource

interface Filters {
  search: string
  category: string
  isActive: string
}

const emptyFilters: Filters = {
  search: "",
  category: "",
  isActive: "",
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

export default function DataSourcesPage() {
  const graphqlClient = useGraphQLClient()
  const [sources, setSources] = useState<DataSource[]>([])
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [filters, setFilters] = useState<Filters>(emptyFilters)

  useEffect(() => {
    async function load() {
      try {
        const data = await graphqlClient.request<{
          dataSourcesCollection: { edges: { node: DataSource }[] }
        }>(DATA_SOURCES_QUERY)
        setSources(extractNodes(data.dataSourcesCollection))
      } catch (error) {
        console.error("Error loading data sources:", error)
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
    let result = sources
    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter(
        (s) =>
          s.displayName.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q)
      )
    }
    if (filters.category) result = result.filter((s) => s.category === filters.category)
    if (filters.isActive) {
      const active = filters.isActive === "Active"
      result = result.filter((s) => s.isActive === active)
    }
    return result
  }, [sources, filters])

  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    return [...filtered].sort((a, b) => {
      const cmp = compareValues(a[sortKey], b[sortKey], sortKey)
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  return (
    <>
      <PageHeader section="Insights" sectionHref="/insights/recommendations" page="Data Sources" />
      <div className="flex-1 p-6">
        <h1 className="text-2xl font-semibold mb-4">Data Sources</h1>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Input
            placeholder="Search sources..."
            value={filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
            className="h-8 w-[200px] text-xs"
          />
          <FilterSelect label="Category" value={filters.category} options={categoryOptions} onChange={(v) => setFilter("category", v)} />
          <FilterSelect label="Active" value={filters.isActive} options={activeOptions} onChange={(v) => setFilter("isActive", v)} />
          {hasFilters && (
            <button
              onClick={() => setFilters(emptyFilters)}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <X className="size-3" />
              Clear
            </button>
          )}
          <div className="ml-auto">
            <span className="text-xs text-muted-foreground">
              {sorted.length} of {sources.length} sources
            </span>
          </div>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : sources.length === 0 ? (
          <p className="text-muted-foreground">No data sources found.</p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead label="Name" sortKey="displayName" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Category" sortKey="category" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Active" sortKey="isActive" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Sync Frequency" sortKey="syncFrequencyHours" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
                  <SortableHead label="Last Sync" sortKey="lastSyncAt" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Created" sortKey="createdAt" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Updated" sortKey="updatedAt" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.displayName}</TableCell>
                    <TableCell><SourceCategoryBadge value={s.category} /></TableCell>
                    <TableCell>
                      <span className={s.isActive ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground"}>
                        {s.isActive ? "Yes" : "No"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{s.syncFrequencyHours}h</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(s.lastSyncAt)}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(s.createdAt)}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(s.updatedAt)}</TableCell>
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
