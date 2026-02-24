"use client"

import { useEffect, useMemo, useState } from "react"
import { gql } from "graphql-request"
import { extractNodes } from "@/lib/graphql"
import { useGraphQLClient } from "@/hooks/use-graphql"
import { PageHeader } from "@/components/page-header"
import { ArrowUp, ArrowDown, ArrowUpDown, X, WrapText } from "lucide-react"
import { InteractionTypeBadge } from "@/components/enum-badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"

interface Interaction {
  id: string
  type: string
  subject: string | null
  snippet: string | null
  occurredAt: string
  createdAt: string
  updatedAt: string
  contact: { fullName: string } | null
}

const INTERACTIONS_QUERY = gql`
  query {
    interactionsCollection(
      orderBy: [{ occurredAt: DescNullsLast }]
      first: 100
    ) {
      edges {
        node {
          id
          type
          subject
          snippet
          occurredAt
          createdAt
          updatedAt
          contact {
            fullName
          }
        }
      }
    }
  }
`

// --- Enum option lists for filters ---
const typeOptions = ["email_sent", "email_received", "calendar_meeting"]

// --- Formatting helpers ---
function formatDate(d: string | null) {
  if (!d) return "\u2014"
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

function truncate(s: string | null, max: number) {
  if (!s) return "\u2014"
  return s.length > max ? s.slice(0, max) + "\u2026" : s
}

// --- Sort / Filter types ---
type SortDir = "asc" | "desc"
type SortKey = "contactName" | "type" | "subject" | "snippet" | "occurredAt" | "createdAt" | "updatedAt"

interface Filters {
  search: string
  type: string
}

const emptyFilters: Filters = {
  search: "",
  type: "",
}

function getFieldValue(i: Interaction, key: SortKey): unknown {
  if (key === "contactName") return i.contact?.fullName ?? null
  return i[key as keyof Interaction]
}

function compareValues(a: unknown, b: unknown): number {
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

export default function InteractionsPage() {
  const graphqlClient = useGraphQLClient()
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [wrapText, setWrapText] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const data = await graphqlClient.request<{
          interactionsCollection: { edges: { node: Interaction }[] }
        }>(INTERACTIONS_QUERY)
        setInteractions(extractNodes(data.interactionsCollection))
      } catch (error) {
        console.error("Error loading interactions:", error)
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
    let result = interactions
    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter(
        (i) =>
          i.contact?.fullName?.toLowerCase().includes(q) ||
          i.subject?.toLowerCase().includes(q) ||
          i.snippet?.toLowerCase().includes(q)
      )
    }
    if (filters.type) result = result.filter((i) => i.type === filters.type)
    return result
  }, [interactions, filters])

  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    return [...filtered].sort((a, b) => {
      const cmp = compareValues(getFieldValue(a, sortKey), getFieldValue(b, sortKey))
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  return (
    <>
      <PageHeader section="CRM" sectionHref="/crm/contacts" page="Interactions" />
      <div className="flex-1 p-6">
        <h1 className="text-2xl font-semibold mb-4">Interactions</h1>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Input
            placeholder="Search interactions..."
            value={filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
            className="h-8 w-[200px] text-xs"
          />
          <FilterSelect label="Type" value={filters.type} options={typeOptions} onChange={(v) => setFilter("type", v)} />
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
              {sorted.length} of {interactions.length} interactions
            </span>
          </div>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : interactions.length === 0 ? (
          <p className="text-muted-foreground">No interactions found.</p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead label="Contact" sortKey="contactName" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Type" sortKey="type" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Subject" sortKey="subject" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Snippet" sortKey="snippet" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Occurred At" sortKey="occurredAt" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Created" sortKey="createdAt" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Updated" sortKey="updatedAt" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">
                      {i.contact?.fullName || "\u2014"}
                    </TableCell>
                    <TableCell>
                      <InteractionTypeBadge value={i.type} />
                    </TableCell>
                    <TableCell className={wrapText ? "min-w-[200px]" : "max-w-[200px] truncate"}>
                      {wrapText ? (i.subject || "\u2014") : truncate(i.subject, 40)}
                    </TableCell>
                    <TableCell className={wrapText ? "min-w-[300px] text-xs text-muted-foreground" : "max-w-[300px] text-muted-foreground"}>
                      <span className={wrapText ? "" : "line-clamp-2 text-xs"}>
                        {wrapText ? (i.snippet || "\u2014") : truncate(i.snippet, 80)}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(i.occurredAt)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(i.createdAt)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(i.updatedAt)}
                    </TableCell>
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
