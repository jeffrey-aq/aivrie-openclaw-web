"use client"

import { useEffect, useMemo, useState } from "react"
import { gql } from "graphql-request"
import { extractNodes } from "@/lib/graphql"
import { useGraphQLClient } from "@/hooks/use-graphql"
import { PageHeader } from "@/components/page-header"
import { ArrowUp, ArrowDown, ArrowUpDown, X, WrapText } from "lucide-react"
import { EntityTypeBadge } from "@/components/enum-badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"

interface Entity {
  id: string
  name: string
  entityType: string
  description: string | null
  mentionCount: number
  aliases: string[] | null
  crmContactId: string | null
  createdAt: string
  updatedAt: string
}

const ENTITIES_QUERY = gql`
  query {
    entitiesCollection(
      orderBy: [{ mentionCount: DescNullsLast }]
      first: 100
    ) {
      edges {
        node {
          id
          name
          entityType
          description
          mentionCount
          aliases
          crmContactId
          createdAt
          updatedAt
        }
      }
    }
  }
`

// --- Enum option lists for filters ---
const entityTypeOptions = ["person", "company", "concept", "product", "technology"]

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
type SortKey = keyof Entity

interface Filters {
  search: string
  entityType: string
}

const emptyFilters: Filters = {
  search: "",
  entityType: "",
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

export default function EntitiesPage() {
  const graphqlClient = useGraphQLClient()
  const [entities, setEntities] = useState<Entity[]>([])
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [wrapText, setWrapText] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const data = await graphqlClient.request<{
          entitiesCollection: { edges: { node: Entity }[] }
        }>(ENTITIES_QUERY)
        setEntities(extractNodes(data.entitiesCollection))
      } catch (error) {
        console.error("Error loading entities:", error)
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
    let result = entities
    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.description?.toLowerCase().includes(q) ||
          e.aliases?.some((a) => a.toLowerCase().includes(q))
      )
    }
    if (filters.entityType) result = result.filter((e) => e.entityType === filters.entityType)
    return result
  }, [entities, filters])

  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    return [...filtered].sort((a, b) => {
      const cmp = compareValues(a[sortKey], b[sortKey], sortKey)
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  return (
    <>
      <PageHeader section="Knowledge Base" sectionHref="/knowledgebase/sources" page="Entities" />
      <div className="flex-1 p-6">
        <h1 className="text-2xl font-semibold mb-4">Entities</h1>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Input
            placeholder="Search entities..."
            value={filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
            className="h-8 w-[200px] text-xs"
          />
          <FilterSelect label="Entity Type" value={filters.entityType} options={entityTypeOptions} onChange={(v) => setFilter("entityType", v)} />
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
              {sorted.length} of {entities.length} entities
            </span>
          </div>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : entities.length === 0 ? (
          <p className="text-muted-foreground">No entities found.</p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead label="Name" sortKey="name" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="sticky left-0 bg-background z-10" />
                  <SortableHead label="Type" sortKey="entityType" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Description" sortKey="description" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Mentions" sortKey="mentionCount" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
                  <TableHead>Aliases</TableHead>
                  <SortableHead label="Created" sortKey="createdAt" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Updated" sortKey="updatedAt" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium sticky left-0 bg-background z-10 min-w-[180px]">
                      {e.name}
                    </TableCell>
                    <TableCell><EntityTypeBadge value={e.entityType} /></TableCell>
                    <TableCell className={wrapText ? "min-w-[250px] text-xs text-muted-foreground" : "max-w-[250px] text-muted-foreground"}>
                      <span className={wrapText ? "" : "line-clamp-2 text-xs"}>{wrapText ? (e.description || "—") : truncate(e.description, 80)}</span>
                    </TableCell>
                    <TableCell className="text-right">{e.mentionCount}</TableCell>
                    <TableCell className={wrapText ? "min-w-[200px]" : "max-w-[200px] truncate"}>
                      {e.aliases?.length ? e.aliases.join(", ") : "—"}
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
