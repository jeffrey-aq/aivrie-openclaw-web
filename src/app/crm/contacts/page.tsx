"use client"

import { useEffect, useMemo, useState } from "react"
import { gql } from "graphql-request"
import { extractNodes } from "@/lib/graphql"
import { useGraphQLClient } from "@/hooks/use-graphql"
import { PageHeader } from "@/components/page-header"
import { ArrowUp, ArrowDown, ArrowUpDown, X, WrapText } from "lucide-react"
import { ContactSourceBadge } from "@/components/enum-badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"

interface Contact {
  id: string
  fullName: string
  company: string | null
  role: string | null
  title: string | null
  phone: string | null
  linkedinUrl: string | null
  howKnown: string | null
  profileSummary: string | null
  relationshipHealthScore: number
  lastInteractionAt: string | null
  interactionCount: number
  firstSeenAt: string | null
  source: string | null
  isNoise: boolean
  createdAt: string
  updatedAt: string
}

const CONTACTS_QUERY = gql`
  query {
    contactsCollection(
      filter: { isNoise: { eq: false } }
      orderBy: [{ lastInteractionAt: DescNullsLast }]
      first: 1000
    ) {
      edges {
        node {
          id
          fullName
          company
          role
          title
          phone
          linkedinUrl
          howKnown
          profileSummary
          relationshipHealthScore
          lastInteractionAt
          interactionCount
          firstSeenAt
          source
          isNoise
          createdAt
          updatedAt
        }
      }
    }
  }
`

// --- Enum option lists for filters ---
const sourceOptions = ["gmail", "google_calendar", "manual"]

// --- Formatting helpers ---
function formatDate(d: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

function truncate(s: string | null, max: number) {
  if (!s) return "—"
  return s.length > max ? s.slice(0, max) + "..." : s
}

function healthColor(score: number) {
  if (score >= 70) return "text-green-600"
  if (score >= 40) return "text-yellow-600"
  return "text-red-600"
}

// --- Sort / Filter types ---
type SortDir = "asc" | "desc"
type SortKey = keyof Contact

interface Filters {
  search: string
  source: string
}

const emptyFilters: Filters = {
  search: "",
  source: "",
}

function compareValues(a: unknown, b: unknown, _key: SortKey): number {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  if (typeof a === "number" && typeof b === "number") return a - b
  if (typeof a === "string" && typeof b === "string") return a.localeCompare(b)
  if (typeof a === "boolean" && typeof b === "boolean") return a === b ? 0 : a ? 1 : -1
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

export default function ContactsPage() {
  const graphqlClient = useGraphQLClient()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [wrapText, setWrapText] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const data = await graphqlClient.request<{
          contactsCollection: { edges: { node: Contact }[] }
        }>(CONTACTS_QUERY)
        setContacts(extractNodes(data.contactsCollection))
      } catch (error) {
        console.error("Error loading contacts:", error)
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
    let result = contacts
    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter(
        (c) =>
          c.fullName.toLowerCase().includes(q) ||
          c.company?.toLowerCase().includes(q) ||
          c.role?.toLowerCase().includes(q) ||
          c.title?.toLowerCase().includes(q) ||
          c.howKnown?.toLowerCase().includes(q)
      )
    }
    if (filters.source) result = result.filter((c) => c.source === filters.source)
    return result
  }, [contacts, filters])

  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    return [...filtered].sort((a, b) => {
      const cmp = compareValues(a[sortKey], b[sortKey], sortKey)
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  return (
    <>
      <PageHeader section="CRM" sectionHref="/crm/contacts" page="Contacts" />
      <div className="flex-1 p-6">
        <h1 className="text-2xl font-semibold mb-4">Contacts</h1>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Input
            placeholder="Search contacts..."
            value={filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
            className="h-8 w-[200px] text-xs"
          />
          <FilterSelect label="Source" value={filters.source} options={sourceOptions} onChange={(v) => setFilter("source", v)} />
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
              {sorted.length} of {contacts.length} contacts
            </span>
          </div>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : contacts.length === 0 ? (
          <p className="text-muted-foreground">No contacts found.</p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead label="Name" sortKey="fullName" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="sticky left-0 bg-background z-10" />
                  <SortableHead label="Company" sortKey="company" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Role" sortKey="role" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Title" sortKey="title" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Phone" sortKey="phone" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="LinkedIn" sortKey="linkedinUrl" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="How Known" sortKey="howKnown" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Profile Summary" sortKey="profileSummary" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Health" sortKey="relationshipHealthScore" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
                  <SortableHead label="Interactions" sortKey="interactionCount" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
                  <SortableHead label="Last Interaction" sortKey="lastInteractionAt" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="First Seen" sortKey="firstSeenAt" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Source" sortKey="source" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Created" sortKey="createdAt" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Updated" sortKey="updatedAt" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium sticky left-0 bg-background z-10 min-w-[180px]">
                      {c.fullName}
                    </TableCell>
                    <TableCell>{c.company || "—"}</TableCell>
                    <TableCell>{c.role || "—"}</TableCell>
                    <TableCell>{c.title || "—"}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {c.phone ? (
                        <a href={`tel:${c.phone}`} className="text-blue-600 hover:underline">{c.phone}</a>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      {c.linkedinUrl ? (
                        <a href={c.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          LinkedIn
                        </a>
                      ) : "—"}
                    </TableCell>
                    <TableCell className={wrapText ? "min-w-[200px]" : "max-w-[200px] truncate"}>{wrapText ? (c.howKnown || "—") : truncate(c.howKnown, 40)}</TableCell>
                    <TableCell className={wrapText ? "min-w-[250px] text-xs" : "max-w-[200px]"}>
                      <span className={wrapText ? "" : "line-clamp-2 text-xs"}>{wrapText ? (c.profileSummary || "—") : truncate(c.profileSummary, 60)}</span>
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${healthColor(c.relationshipHealthScore)}`}>
                      {c.relationshipHealthScore}
                    </TableCell>
                    <TableCell className="text-right">{c.interactionCount}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(c.lastInteractionAt)}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(c.firstSeenAt)}</TableCell>
                    <TableCell><ContactSourceBadge value={c.source} /></TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(c.createdAt)}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(c.updatedAt)}</TableCell>
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
