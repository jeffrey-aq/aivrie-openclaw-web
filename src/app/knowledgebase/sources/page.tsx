"use client"

import { useEffect, useMemo, useState } from "react"
import { gql } from "graphql-request"
import { extractNodes } from "@/lib/graphql"
import { useGraphQLClient } from "@/hooks/use-graphql"
import { PageHeader } from "@/components/page-header"
import { ArrowUp, ArrowDown, ArrowUpDown, X, WrapText } from "lucide-react"
import { SourceTypeBadge } from "@/components/enum-badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"

interface Source {
  id: string
  sourceType: string | null
  url: string | null
  title: string | null
  author: string | null
  siteName: string | null
  summary: string | null
  publishedAt: string | null
  wordCount: number | null
  createdAt: string | null
  updatedAt: string | null
}

const SOURCES_QUERY = gql`
  query {
    sourcesCollection(
      orderBy: [{ createdAt: DescNullsLast }]
      first: 100
    ) {
      edges {
        node {
          id
          sourceType
          url
          title
          author
          siteName
          summary
          publishedAt
          wordCount
          createdAt
          updatedAt
        }
      }
    }
  }
`

// --- Enum option lists for filters ---
const sourceTypeOptions = ["article", "youtube_video", "tweet", "twitter_thread", "pdf"]

// --- Formatting helpers ---
function formatNumber(n: number | null) {
  if (n == null) return "—"
  return n.toLocaleString()
}

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
type SortKey = keyof Source

interface Filters {
  search: string
  sourceType: string
}

const emptyFilters: Filters = {
  search: "",
  sourceType: "",
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

export default function SourcesPage() {
  const graphqlClient = useGraphQLClient()
  const [sources, setSources] = useState<Source[]>([])
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [wrapText, setWrapText] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const data = await graphqlClient.request<{
          sourcesCollection: { edges: { node: Source }[] }
        }>(SOURCES_QUERY)
        setSources(extractNodes(data.sourcesCollection))
      } catch (error) {
        console.error("Error loading sources:", error)
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
          s.title?.toLowerCase().includes(q) ||
          s.author?.toLowerCase().includes(q) ||
          s.siteName?.toLowerCase().includes(q) ||
          s.summary?.toLowerCase().includes(q)
      )
    }
    if (filters.sourceType) result = result.filter((s) => s.sourceType === filters.sourceType)
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
      <PageHeader section="Knowledge Base" sectionHref="/knowledgebase/sources" page="Sources" />
      <div className="flex-1 p-6">
        <h1 className="text-2xl font-semibold mb-4">Sources</h1>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Input
            placeholder="Search sources..."
            value={filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
            className="h-8 w-[200px] text-xs"
          />
          <FilterSelect label="Source Type" value={filters.sourceType} options={sourceTypeOptions} onChange={(v) => setFilter("sourceType", v)} />
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
              {sorted.length} of {sources.length} sources
            </span>
          </div>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : sources.length === 0 ? (
          <p className="text-muted-foreground">No sources found.</p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead label="Title" sortKey="title" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="sticky left-0 bg-background z-10" />
                  <SortableHead label="Type" sortKey="sourceType" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Author" sortKey="author" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Site" sortKey="siteName" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Words" sortKey="wordCount" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
                  <SortableHead label="Summary" sortKey="summary" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Published" sortKey="publishedAt" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Created" sortKey="createdAt" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Updated" sortKey="updatedAt" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium sticky left-0 bg-background z-10 min-w-[180px]">
                      {s.url ? (
                        <a href={s.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                          {s.title || "Untitled"}
                        </a>
                      ) : (
                        s.title || "Untitled"
                      )}
                    </TableCell>
                    <TableCell><SourceTypeBadge value={s.sourceType} /></TableCell>
                    <TableCell>{s.author || "—"}</TableCell>
                    <TableCell>{s.siteName || "—"}</TableCell>
                    <TableCell className="text-right">{formatNumber(s.wordCount)}</TableCell>
                    <TableCell className={wrapText ? "min-w-[250px] text-xs" : "max-w-[200px]"}><span className={wrapText ? "" : "line-clamp-2 text-xs"}>{wrapText ? (s.summary || "—") : truncate(s.summary, 60)}</span></TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(s.publishedAt)}</TableCell>
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
