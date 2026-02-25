"use client"

import React, { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { gql } from "graphql-request"
import { extractNodes } from "@/lib/graphql"
import { useGraphQLClient } from "@/hooks/use-graphql"
import { PageHeader } from "@/components/page-header"
import { ArrowUp, ArrowDown, ArrowUpDown, X, ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown, LayoutGrid } from "lucide-react"
import {
  UploadFrequencyBadge,
  ContentTypeBadge,
  RevenueRangeBadge,
  MonetizationBadges,
  CompetitiveThreatBadge,
  StatusBadge,
  WorkstreamBadge,
  CreatorBadge,
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

interface Creator {
  id: string
  title: string
  channelId: string
  channelUrl: string | null
  subscribers: number | string | null
  totalViews: number | string | null
  videoCount: number | null
  viewsToSubRatio: number | null
  avgViewsPerVideo: number | null
  uploadFrequency: string | null
  contentTypes: string | null
  topContentType: string | null
  typicalVideoLength: number | null
  estRevenueRange: string | null
  otherVentures: string | null
  monetization: string[] | null
  strengths: string | null
  opportunities: string | null
  keyInsights: string | null
  competitiveThreat: string | null
  lastAnalyzedDate: string | null
  status: string | null
  workstream: string | null
  notes: string | null
  avatarUrl: string | null
  bannerUrl: string | null
  description: string | null
  keywords: string[] | null
  country: string | null
  topicCategories: string[] | null
  trailerVideoId: string | null
}

const CREATORS_QUERY = gql`
  query {
    youtubeCreatorsCollection(orderBy: [{ title: AscNullsLast }], first: 1000) {
      edges {
        node {
          id
          title
          channelId
          channelUrl
          subscribers
          totalViews
          videoCount
          viewsToSubRatio
          avgViewsPerVideo
          uploadFrequency
          contentTypes
          topContentType
          typicalVideoLength
          estRevenueRange
          otherVentures
          monetization
          strengths
          opportunities
          keyInsights
          competitiveThreat
          lastAnalyzedDate
          status
          workstream
          notes
          avatarUrl
          bannerUrl
          description
          keywords
          country
          topicCategories
          trailerVideoId
        }
      }
    }
  }
`

const uploadFrequencyOptions = ["Daily", "3-4x/week", "Weekly", "Bi-Weekly", "Monthly", "Irregular"]
const competitiveThreatOptions = ["Low", "Medium", "High"]
const statusOptions = ["Active", "Rising", "Monitoring", "Inactive"]
const workstreamOptions = ["Research", "YouTube", "SaaS", "Newsletter", "Apps", "Courses"]

function formatNumber(n: number | null) {
  if (n == null) return "\u2014"
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toLocaleString()
}

function formatPercent(n: number | null) {
  if (n == null) return "\u2014"
  return `${Math.round(n)}%`
}

function formatDate(d: string | null) {
  if (!d) return "\u2014"
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

const revenueOrder: Record<string, number> = {
  "<$1K/mo": 0, "$1-5K/mo": 1, "$5-10K/mo": 2, "$10-50k/mo": 3, "$50K+/mo": 4,
}

type SortDir = "asc" | "desc"
type SortKey = keyof Creator

interface Filters {
  search: string
  uploadFrequency: string
  competitiveThreat: string
  status: string
  workstream: string
}

const emptyFilters: Filters = {
  search: "",
  uploadFrequency: "",
  competitiveThreat: "",
  status: "",
  workstream: "",
}

function compareValues(a: unknown, b: unknown, key: SortKey): number {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  if (key === "estRevenueRange") return (revenueOrder[a as string] ?? -1) - (revenueOrder[b as string] ?? -1)
  if (typeof a === "number" && typeof b === "number") return a - b
  if (typeof a === "string" && typeof b === "string") return a.localeCompare(b)
  return 0
}

function FilterSelect({
  label, value, options, onChange,
}: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground min-w-[100px]"
    >
      <option value="">{label}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

function SortableHead({
  label, sortKey, currentSort, currentDir, onSort, className,
}: { label: string; sortKey: SortKey; currentSort: SortKey | null; currentDir: SortDir; onSort: (key: SortKey) => void; className?: string }) {
  const active = currentSort === sortKey
  return (
    <TableHead className={`cursor-pointer select-none hover:bg-muted/50 transition-colors ${className || ""}`} onClick={() => onSort(sortKey)}>
      <div className="flex items-center gap-1">
        <span>{label}</span>
        {active ? (currentDir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />) : <ArrowUpDown className="size-3 opacity-30" />}
      </div>
    </TableHead>
  )
}

// Number of primary columns (for colspan on detail row)
const PRIMARY_COL_COUNT = 8

export default function CreatorsPage() {
  const graphqlClient = useGraphQLClient()
  const [creators, setCreators] = useState<Creator[]>([])
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [allExpanded, setAllExpanded] = useState(false)
  const [gridView, setGridView] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const data = await graphqlClient.request<{
          youtubeCreatorsCollection: { edges: { node: Creator }[] }
        }>(CREATORS_QUERY)
        setCreators(extractNodes(data.youtubeCreatorsCollection))
      } catch (error) {
        console.error("Error loading creators:", error)
      }
      setLoading(false)
    }
    load()
  }, [graphqlClient])

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else { setSortKey(key); setSortDir("asc") }
  }

  function setFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((f) => ({ ...f, [key]: value }))
  }

  function toggleRow(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (allExpanded) {
      setExpanded(new Set())
      setAllExpanded(false)
    } else {
      setExpanded(new Set(sorted.map((c) => c.id)))
      setAllExpanded(true)
    }
  }

  const hasFilters = Object.values(filters).some((v) => v !== "")

  const filtered = useMemo(() => {
    let result = creators
    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.strengths?.toLowerCase().includes(q) ||
          c.opportunities?.toLowerCase().includes(q) ||
          c.keyInsights?.toLowerCase().includes(q) ||
          c.notes?.toLowerCase().includes(q)
      )
    }
    if (filters.uploadFrequency) result = result.filter((c) => c.uploadFrequency === filters.uploadFrequency)
    if (filters.competitiveThreat) result = result.filter((c) => c.competitiveThreat === filters.competitiveThreat)
    if (filters.status) result = result.filter((c) => c.status === filters.status)
    if (filters.workstream) result = result.filter((c) => c.workstream === filters.workstream)
    return result
  }, [creators, filters])

  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    return [...filtered].sort((a, b) => {
      const cmp = compareValues(a[sortKey], b[sortKey], sortKey)
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  function isExpanded(id: string) {
    return allExpanded ? !expanded.has(id) : expanded.has(id)
  }

  // Re-implement toggleRow and toggleAll to work with the inverted logic
  // Actually, let's keep it simple: expanded set = explicitly expanded rows. allExpanded is separate.
  // When allExpanded is true, all are expanded. Individual toggle removes from "all".

  return (
    <>
      <PageHeader section="YouTube" sectionHref="/research/creators" page="Creators" />
      <div className="flex-1 p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">YouTube Creators</h1>
          <button
            onClick={() => setGridView((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
              gridView
                ? "bg-blue-500 text-white shadow-sm hover:bg-blue-600"
                : "bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-400 dark:hover:bg-blue-900"
            }`}
          >
            <LayoutGrid className="size-3.5" />
            {gridView ? "Grid View" : "Grid View"}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Input
            placeholder="Search creators..."
            value={filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
            className="h-8 w-[200px] text-xs"
          />
          <FilterSelect label="Frequency" value={filters.uploadFrequency} options={uploadFrequencyOptions} onChange={(v) => setFilter("uploadFrequency", v)} />
          <FilterSelect label="Threat" value={filters.competitiveThreat} options={competitiveThreatOptions} onChange={(v) => setFilter("competitiveThreat", v)} />
          <FilterSelect label="Status" value={filters.status} options={statusOptions} onChange={(v) => setFilter("status", v)} />
          <FilterSelect label="Workstream" value={filters.workstream} options={workstreamOptions} onChange={(v) => setFilter("workstream", v)} />
          {hasFilters && (
            <button
              onClick={() => setFilters(emptyFilters)}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <X className="size-3" /> Clear
            </button>
          )}
          <div className="ml-auto flex items-center gap-3">
            {!gridView && (
              <button
                onClick={toggleAll}
                className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors ${allExpanded ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
              >
                {allExpanded ? <ChevronsDownUp className="size-3" /> : <ChevronsUpDown className="size-3" />}
                {allExpanded ? "Collapse" : "Expand"}
              </button>
            )}
            <span className="text-xs text-muted-foreground">
              {sorted.length} of {creators.length} creators
            </span>
          </div>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : creators.length === 0 ? (
          <p className="text-muted-foreground">No creators found.</p>
        ) : gridView ? (
          <div className="grid gap-x-4 gap-y-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sorted.map((c) => (
              <Link
                key={c.id}
                href={`/research/videos?creator=${encodeURIComponent(c.channelId)}`}
                className="group rounded-2xl p-2 -m-2 transition-colors hover:bg-accent/60"
              >
                {/* Banner */}
                <div className="aspect-[16/5] bg-muted rounded-xl overflow-hidden">
                  {c.bannerUrl ? (
                    <img src={c.bannerUrl} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-red-500/20 via-red-500/10 to-transparent" />
                  )}
                </div>
                {/* Info row — avatar + text */}
                <div className="flex gap-3 mt-3">
                  {c.avatarUrl ? (
                    <img src={c.avatarUrl} alt={c.title} className="size-9 rounded-full shrink-0 mt-0.5" />
                  ) : (
                    <div className="size-9 rounded-full shrink-0 mt-0.5 bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
                      {c.title.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium leading-snug truncate group-hover:text-primary transition-colors">{c.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatNumber(Number(c.subscribers) || null)} subscribers{c.videoCount ? ` \u00b7 ${formatNumber(c.videoCount)} videos` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {c.uploadFrequency || ""}{c.uploadFrequency && c.country ? ` \u00b7 ` : ""}{c.country || ""}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <SortableHead label="Creator" sortKey="title" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="# Videos" sortKey="videoCount" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
                  <SortableHead label="Avg Views" sortKey="avgViewsPerVideo" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
                  <SortableHead label="Frequency" sortKey="uploadFrequency" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Threat" sortKey="competitiveThreat" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Status" sortKey="status" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Workstream" sortKey="workstream" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((c) => {
                  const open = isExpanded(c.id)
                  return (
                    <React.Fragment key={c.id}>
                      <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => toggleRow(c.id)}>
                        <TableCell className="w-8 px-2">
                          {open ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />}
                        </TableCell>
                        <TableCell className="font-medium">
                          <Link
                            href={`/research/videos?creator=${encodeURIComponent(c.channelId)}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <CreatorBadge name={c.title} channelId={c.channelId} />
                          </Link>
                        </TableCell>
                        <TableCell className="text-right">{formatNumber(c.videoCount)}</TableCell>
                        <TableCell className="text-right">{formatNumber(c.avgViewsPerVideo)}</TableCell>
                        <TableCell><UploadFrequencyBadge value={c.uploadFrequency} /></TableCell>
                        <TableCell><CompetitiveThreatBadge value={c.competitiveThreat} /></TableCell>
                        <TableCell><StatusBadge value={c.status} /></TableCell>
                        <TableCell><WorkstreamBadge value={c.workstream} /></TableCell>
                      </TableRow>
                      {open && (
                        <TableRow className="bg-muted/30 hover:bg-muted/40">
                          <TableCell />
                          <TableCell colSpan={PRIMARY_COL_COUNT - 1}>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-2 py-2 text-sm">
                              {c.avatarUrl && (
                                <Detail label="Avatar">
                                  <img src={c.avatarUrl} alt={c.title} className="size-10 rounded-full" />
                                </Detail>
                              )}
                              <Detail label="Country" value={c.country || "\u2014"} />
                              <Detail label="Views:Sub %" value={formatPercent(c.viewsToSubRatio)} />
                              <Detail label="Video Length" value={c.typicalVideoLength != null ? `${c.typicalVideoLength}m` : "\u2014"} />
                              <Detail label="Content Type"><ContentTypeBadge value={c.contentTypes} /></Detail>
                              <Detail label="Top Content Type" value={c.topContentType || "\u2014"} />
                              <Detail label="Est. Revenue"><RevenueRangeBadge value={c.estRevenueRange} /></Detail>
                              <Detail label="Monetization"><MonetizationBadges values={c.monetization} /></Detail>
                              <Detail label="Last Analyzed" value={formatDate(c.lastAnalyzedDate)} />
                              <Detail label="Other Ventures" value={c.otherVentures || "\u2014"} />
                              <Detail label="Keywords" value={c.keywords && c.keywords.length > 0 ? c.keywords.join(", ") : "\u2014"} wide />
                              <Detail label="Topics" value={c.topicCategories && c.topicCategories.length > 0 ? c.topicCategories.join(", ") : "\u2014"} wide />
                              <Detail label="Description" value={c.description || "\u2014"} wide />
                              <Detail label="Strengths" value={c.strengths || "\u2014"} wide />
                              <Detail label="Opportunities" value={c.opportunities || "\u2014"} wide />
                              <Detail label="Key Insights" value={c.keyInsights || "\u2014"} wide />
                              <Detail label="Notes" value={c.notes || "\u2014"} wide />
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </>
  )
}

function Detail({ label, value, children, wide }: { label: string; value?: string; children?: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-2" : ""}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="mt-0.5">{children || <span className="text-xs">{value}</span>}</div>
    </div>
  )
}
