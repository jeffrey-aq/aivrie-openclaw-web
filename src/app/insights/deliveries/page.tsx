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

interface DigestDelivery {
  id: string
  telegramMessageId: string
  telegramChatId: string
  telegramTopicId: string | null
  recommendationNumbers: number[]
  deliveredAt: string
  createdAt: string
  updatedAt: string
}

const DELIVERIES_QUERY = gql`
  query {
    digestDeliveriesCollection(
      orderBy: [{ deliveredAt: DescNullsLast }]
      first: 50
    ) {
      edges {
        node {
          id
          telegramMessageId
          telegramChatId
          telegramTopicId
          recommendationNumbers
          deliveredAt
          createdAt
          updatedAt
        }
      }
    }
  }
`

// --- Formatting helpers ---
function formatDatetime(d: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatDate(d: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

// --- Sort / Filter types ---
type SortDir = "asc" | "desc"
type SortKey = keyof DigestDelivery

interface Filters {
  search: string
}

const emptyFilters: Filters = {
  search: "",
}

function compareValues(a: unknown, b: unknown, _key: SortKey): number {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  if (typeof a === "number" && typeof b === "number") return a - b
  if (typeof a === "string" && typeof b === "string") return a.localeCompare(b)
  if (Array.isArray(a) && Array.isArray(b)) return a.length - b.length
  return 0
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

export default function DeliveriesPage() {
  const graphqlClient = useGraphQLClient()
  const [deliveries, setDeliveries] = useState<DigestDelivery[]>([])
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [wrapText, setWrapText] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const data = await graphqlClient.request<{
          digestDeliveriesCollection: { edges: { node: DigestDelivery }[] }
        }>(DELIVERIES_QUERY)
        setDeliveries(extractNodes(data.digestDeliveriesCollection))
      } catch (error) {
        console.error("Error loading deliveries:", error)
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
    let result = deliveries
    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter(
        (d) =>
          d.telegramChatId.toLowerCase().includes(q) ||
          d.telegramTopicId?.toLowerCase().includes(q)
      )
    }
    return result
  }, [deliveries, filters])

  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    return [...filtered].sort((a, b) => {
      const cmp = compareValues(a[sortKey], b[sortKey], sortKey)
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  return (
    <>
      <PageHeader section="Insights" sectionHref="/insights/recommendations" page="Digest Deliveries" />
      <div className="flex-1 p-6">
        <h1 className="text-2xl font-semibold mb-4">Digest Deliveries</h1>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Input
            placeholder="Search chat ID, topic ID..."
            value={filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
            className="h-8 w-[200px] text-xs"
          />
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
              {sorted.length} of {deliveries.length} deliveries
            </span>
          </div>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : deliveries.length === 0 ? (
          <p className="text-muted-foreground">No digest deliveries found.</p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead label="Delivered" sortKey="deliveredAt" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Chat ID" sortKey="telegramChatId" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Topic" sortKey="telegramTopicId" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Message ID" sortKey="telegramMessageId" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Recommendations" sortKey="recommendationNumbers" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Created" sortKey="createdAt" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Updated" sortKey="updatedAt" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium whitespace-nowrap">
                      {formatDatetime(d.deliveredAt)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">{d.telegramChatId}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{d.telegramTopicId || "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{d.telegramMessageId}</TableCell>
                    <TableCell>
                      {d.recommendationNumbers.length > 0
                        ? d.recommendationNumbers.join(", ")
                        : "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(d.createdAt)}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(d.updatedAt)}</TableCell>
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
