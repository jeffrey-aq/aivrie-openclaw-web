"use client"

import { useEffect, useMemo, useState } from "react"
import { gql } from "graphql-request"
import { extractNodes } from "@/lib/graphql"
import { useGraphQLClient } from "@/hooks/use-graphql"
import { PageHeader } from "@/components/page-header"
import { ArrowUp, ArrowDown, ArrowUpDown, X, WrapText } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"

interface PreferencePattern {
  id: string
  patternType: string
  patternKey: string
  patternValue: Record<string, unknown>
  confidence: number | null
  sampleCount: number
  createdAt: string
  updatedAt: string
}

const PREFERENCES_QUERY = gql`
  query {
    preferencePatternsCollection(
      orderBy: [{ updatedAt: DescNullsLast }]
      first: 1000
    ) {
      edges {
        node {
          id
          patternType
          patternKey
          patternValue
          confidence
          sampleCount
          createdAt
          updatedAt
        }
      }
    }
  }
`

// --- Formatting helpers ---
function formatDate(d: string | null) {
  if (!d) return "\u2014"
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

// --- Sort / Filter types ---
type SortDir = "asc" | "desc"
type SortKey = keyof PreferencePattern

interface Filters {
  search: string
  patternType: string
}

const emptyFilters: Filters = {
  search: "",
  patternType: "",
}

function compareValues(a: unknown, b: unknown, _key: SortKey): number {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  if (typeof a === "number" && typeof b === "number") return a - b
  if (typeof a === "string" && typeof b === "string") return a.localeCompare(b)
  // For objects (patternValue), compare by JSON string
  if (typeof a === "object" && typeof b === "object") return JSON.stringify(a).localeCompare(JSON.stringify(b))
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

export default function PreferencesPage() {
  const graphqlClient = useGraphQLClient()
  const [patterns, setPatterns] = useState<PreferencePattern[]>([])
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [wrapText, setWrapText] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const data = await graphqlClient.request<{
          preferencePatternsCollection: { edges: { node: PreferencePattern }[] }
        }>(PREFERENCES_QUERY)
        setPatterns(extractNodes(data.preferencePatternsCollection))
      } catch (error) {
        console.error("Error loading preferences:", error)
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

  // Dynamically build unique patternType options from the data
  const patternTypeOptions = useMemo(() => {
    const types = new Set(patterns.map((p) => p.patternType))
    return Array.from(types).sort()
  }, [patterns])

  const filtered = useMemo(() => {
    let result = patterns
    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter(
        (p) =>
          p.patternType.toLowerCase().includes(q) ||
          p.patternKey.toLowerCase().includes(q)
      )
    }
    if (filters.patternType) result = result.filter((p) => p.patternType === filters.patternType)
    return result
  }, [patterns, filters])

  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    return [...filtered].sort((a, b) => {
      const cmp = compareValues(a[sortKey], b[sortKey], sortKey)
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  return (
    <>
      <PageHeader section="Insights" sectionHref="/insights/recommendations" page="Preferences" />
      <div className="flex-1 p-6">
        <h1 className="text-2xl font-semibold mb-4">Preference Patterns</h1>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Input
            placeholder="Search type or key..."
            value={filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
            className="h-8 w-[200px] text-xs"
          />
          <FilterSelect label="Type" value={filters.patternType} options={patternTypeOptions} onChange={(v) => setFilter("patternType", v)} />
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
              {sorted.length} of {patterns.length} patterns
            </span>
          </div>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : patterns.length === 0 ? (
          <p className="text-muted-foreground">No preference patterns found.</p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead label="Type" sortKey="patternType" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Key" sortKey="patternKey" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Value" sortKey="patternValue" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Confidence" sortKey="confidence" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
                  <SortableHead label="Samples" sortKey="sampleCount" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
                  <SortableHead label="Created" sortKey="createdAt" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Updated" sortKey="updatedAt" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.patternType}</TableCell>
                    <TableCell>{p.patternKey}</TableCell>
                    <TableCell className={`font-mono text-xs text-muted-foreground ${wrapText ? "min-w-[300px] whitespace-pre-wrap break-all" : "max-w-[300px] truncate"}`}>
                      {JSON.stringify(p.patternValue)}
                    </TableCell>
                    <TableCell className="text-right">
                      {p.confidence != null ? `${(p.confidence * 100).toFixed(0)}%` : "\u2014"}
                    </TableCell>
                    <TableCell className="text-right">{p.sampleCount}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(p.createdAt)}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(p.updatedAt)}</TableCell>
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
