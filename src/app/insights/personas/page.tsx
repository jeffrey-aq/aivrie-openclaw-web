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

interface SpecialistPersona {
  id: string
  name: string
  displayName: string
  focus: string
  systemPrompt: string
  dataSources: string[]
  isActive: boolean
  model: string
  createdAt: string
  updatedAt: string
}

const PERSONAS_QUERY = gql`
  query {
    specialistPersonasCollection(
      orderBy: [{ name: AscNullsLast }]
      first: 50
    ) {
      edges {
        node {
          id
          name
          displayName
          focus
          systemPrompt
          dataSources
          isActive
          model
          createdAt
          updatedAt
        }
      }
    }
  }
`

// --- Formatting helpers ---
function formatDate(d: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

// --- Sort / Filter types ---
type SortDir = "asc" | "desc"
type SortKey = keyof SpecialistPersona

interface Filters {
  search: string
  isActive: string
  model: string
}

const emptyFilters: Filters = {
  search: "",
  isActive: "",
  model: "",
}

function compareValues(a: unknown, b: unknown, _key: SortKey): number {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  if (typeof a === "boolean" && typeof b === "boolean") return a === b ? 0 : a ? -1 : 1
  if (typeof a === "number" && typeof b === "number") return a - b
  if (Array.isArray(a) && Array.isArray(b)) return a.length - b.length
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

export default function PersonasPage() {
  const graphqlClient = useGraphQLClient()
  const [personas, setPersonas] = useState<SpecialistPersona[]>([])
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [wrapText, setWrapText] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const data = await graphqlClient.request<{
          specialistPersonasCollection: { edges: { node: SpecialistPersona }[] }
        }>(PERSONAS_QUERY)
        setPersonas(extractNodes(data.specialistPersonasCollection))
      } catch (error) {
        console.error("Error loading personas:", error)
      }
      setLoading(false)
    }
    load()
  }, [graphqlClient])

  // Build model options dynamically from data
  const modelOptions = useMemo(() => {
    const models = new Set(personas.map((p) => p.model).filter(Boolean))
    return Array.from(models).sort()
  }, [personas])

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
    let result = personas
    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.displayName?.toLowerCase().includes(q) ||
          p.focus?.toLowerCase().includes(q)
      )
    }
    if (filters.isActive) {
      const active = filters.isActive === "Active"
      result = result.filter((p) => p.isActive === active)
    }
    if (filters.model) {
      result = result.filter((p) => p.model === filters.model)
    }
    return result
  }, [personas, filters])

  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    return [...filtered].sort((a, b) => {
      const cmp = compareValues(a[sortKey], b[sortKey], sortKey)
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  return (
    <>
      <PageHeader section="Insights" sectionHref="/insights/recommendations" page="Specialist Personas" />
      <div className="flex-1 p-6">
        <h1 className="text-2xl font-semibold mb-4">Specialist Personas</h1>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Input
            placeholder="Search personas..."
            value={filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
            className="h-8 w-[200px] text-xs"
          />
          <FilterSelect label="Active" value={filters.isActive} options={["Active", "Inactive"]} onChange={(v) => setFilter("isActive", v)} />
          <FilterSelect label="Model" value={filters.model} options={modelOptions} onChange={(v) => setFilter("model", v)} />
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
              {sorted.length} of {personas.length} personas
            </span>
          </div>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : personas.length === 0 ? (
          <p className="text-muted-foreground">No specialist personas found.</p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead label="Name" sortKey="name" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="sticky left-0 bg-background z-10" />
                  <SortableHead label="Display Name" sortKey="displayName" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Focus" sortKey="focus" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Model" sortKey="model" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Data Sources" sortKey="dataSources" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Active" sortKey="isActive" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Created" sortKey="createdAt" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Updated" sortKey="updatedAt" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium sticky left-0 bg-background z-10 min-w-[180px]">
                      {p.name}
                    </TableCell>
                    <TableCell>{p.displayName || "—"}</TableCell>
                    <TableCell className={wrapText ? "min-w-[250px]" : "max-w-[250px] truncate"}>
                      {p.focus || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                      {p.model || "—"}
                    </TableCell>
                    <TableCell className={wrapText ? "min-w-[200px] text-xs" : "max-w-[200px]"}>
                      <span className={wrapText ? "" : "line-clamp-2 text-xs"}>
                        {p.dataSources && p.dataSources.length > 0
                          ? wrapText
                            ? p.dataSources.join(", ")
                            : `${p.dataSources.length} source${p.dataSources.length !== 1 ? "s" : ""}`
                          : "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5">
                        <span className={`size-2 rounded-full ${p.isActive ? "bg-emerald-500" : "bg-red-500"}`} />
                        <span className={`text-xs ${p.isActive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                          {p.isActive ? "Active" : "Inactive"}
                        </span>
                      </span>
                    </TableCell>
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
