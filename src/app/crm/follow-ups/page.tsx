"use client"

import { useEffect, useMemo, useState } from "react"
import { gql } from "graphql-request"
import { extractNodes } from "@/lib/graphql"
import { useGraphQLClient } from "@/hooks/use-graphql"
import { PageHeader } from "@/components/page-header"
import { ArrowUp, ArrowDown, ArrowUpDown, X, WrapText } from "lucide-react"
import { FollowUpStatusBadge } from "@/components/enum-badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"

interface FollowUp {
  id: string
  note: string | null
  dueDate: string | null
  snoozedUntil: string | null
  completedAt: string | null
  status: string | null
  createdAt: string | null
  updatedAt: string | null
  contact: { fullName: string } | null
}

const FOLLOW_UPS_QUERY = gql`
  query {
    followUpsCollection(orderBy: [{ dueDate: AscNullsLast }], first: 1000) {
      edges {
        node {
          id
          note
          dueDate
          snoozedUntil
          completedAt
          status
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
const statusOptions = ["pending", "snoozed", "done"]

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
type SortKey = keyof FollowUp

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

export default function FollowUpsPage() {
  const graphqlClient = useGraphQLClient()
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [wrapText, setWrapText] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const data = await graphqlClient.request<{
          followUpsCollection: { edges: { node: FollowUp }[] }
        }>(FOLLOW_UPS_QUERY)
        setFollowUps(extractNodes(data.followUpsCollection))
      } catch (error) {
        console.error("Error loading follow-ups:", error)
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
    let result = followUps
    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter(
        (f) =>
          f.contact?.fullName.toLowerCase().includes(q) ||
          f.note?.toLowerCase().includes(q)
      )
    }
    if (filters.status) result = result.filter((f) => f.status === filters.status)
    return result
  }, [followUps, filters])

  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    return [...filtered].sort((a, b) => {
      let aVal: unknown = a[sortKey]
      let bVal: unknown = b[sortKey]
      // For the "contact" column, sort by fullName
      if (sortKey === "contact") {
        aVal = (a.contact as { fullName: string } | null)?.fullName ?? null
        bVal = (b.contact as { fullName: string } | null)?.fullName ?? null
      }
      const cmp = compareValues(aVal, bVal, sortKey)
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  return (
    <>
      <PageHeader section="CRM" sectionHref="/crm/contacts" page="Follow-ups" />
      <div className="flex-1 p-6">
        <h1 className="text-2xl font-semibold mb-4">Follow-ups</h1>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Input
            placeholder="Search follow-ups..."
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
              {sorted.length} of {followUps.length} follow-ups
            </span>
          </div>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : followUps.length === 0 ? (
          <p className="text-muted-foreground">No follow-ups found.</p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead label="Contact" sortKey="contact" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="sticky left-0 bg-background z-10" />
                  <SortableHead label="Note" sortKey="note" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Due Date" sortKey="dueDate" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Snoozed Until" sortKey="snoozedUntil" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Completed At" sortKey="completedAt" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Status" sortKey="status" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Created" sortKey="createdAt" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Updated" sortKey="updatedAt" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium sticky left-0 bg-background z-10 min-w-[180px]">
                      {f.contact?.fullName || "—"}
                    </TableCell>
                    <TableCell className={wrapText ? "min-w-[250px] text-xs" : "max-w-[300px]"}>
                      <span className={wrapText ? "" : "line-clamp-2 text-xs"}>
                        {wrapText ? (f.note || "—") : truncate(f.note, 80)}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(f.dueDate)}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(f.snoozedUntil)}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(f.completedAt)}</TableCell>
                    <TableCell><FollowUpStatusBadge value={f.status} /></TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(f.createdAt)}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(f.updatedAt)}</TableCell>
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
