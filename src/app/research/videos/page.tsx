"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { gql } from "graphql-request"
import { extractNodes } from "@/lib/graphql"
import { useGraphQLClient } from "@/hooks/use-graphql"
import { PageHeader } from "@/components/page-header"
import { ArrowUp, ArrowDown, ArrowUpDown, X, ChevronDown, ChevronLeft, ChevronRight, ChevronsDownUp, ChevronsUpDown, LayoutGrid } from "lucide-react"
import {
  DurationTypeBadge,
  CreatorBadge,
  TagBadge,
  TopicBadge,
  getCreatorCardHover,
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

interface Video {
  id: string
  title: string
  type: string | null
  channelId: string
  videoId: string
  url: string | null
  views: number | null
  likes: number | null
  comments: number | null
  engagementRatePercent: number | null
  publishedDate: string | null
  duration: number | null
  tags: string[] | null
  workstream: string | null
  status: string | null
  notes: string | null
  transcript: string | null
  summary: string | null
  thumbnailUrl: string | null
  description: string | null
  captionAvailable: boolean | null
  language: string | null
  definition: string | null
  topicCategories: string[] | null
  categoryId: number | null
  durationType: string | null
  createdAt: string | null
  updatedAt: string | null
}

interface Creator {
  channelId: string
  title: string
  avatarUrl: string | null
}

const CREATORS_LOOKUP_QUERY = gql`
  query {
    youtubeCreatorsCollection(orderBy: [{ title: AscNullsLast }], first: 1000) {
      edges {
        node {
          channelId
          title
          avatarUrl
        }
      }
    }
  }
`

const PAGE_SIZE_OPTIONS = [
  { value: 30, label: "30" },
  { value: 100, label: "100" },
  { value: 250, label: "250" },
  { value: 1000, label: "All" },
] as const

type PageSize = (typeof PAGE_SIZE_OPTIONS)[number]["value"]

type SortDir = "asc" | "desc"
type SortKey = keyof Video | "creatorName" | "likesPerView" | "commentsPerView"

// Sort keys that map directly to DB columns for server-side ordering
const SERVER_SORT_FIELDS: Partial<Record<SortKey, string>> = {
  title: "title",
  views: "views",
  likes: "likes",
  comments: "comments",
  duration: "duration",
  durationType: "durationType",
  publishedDate: "publishedDate",
  engagementRatePercent: "engagementRatePercent",
}

interface ServerFilters {
  channelId?: string
  durationType?: string
}

function buildVideosQuery(
  filters: ServerFilters,
  limit: number = 1000,
  sortField?: string,
  sortDirection: SortDir = "desc",
): string {
  const conditions: string[] = []
  if (filters.channelId) conditions.push(`channelId: { eq: "${filters.channelId}" }`)
  if (filters.durationType) conditions.push(`durationType: { eq: "${filters.durationType}" }`)
  const filter = conditions.length > 0 ? `filter: { ${conditions.join(", ")} }, ` : ""
  const dir = sortDirection === "asc" ? "AscNullsLast" : "DescNullsLast"
  const orderBy = sortField
    ? `{ ${sortField}: ${dir} }`
    : "{ publishedDate: DescNullsLast }"
  return `{
    youtubeVideosCollection(${filter}orderBy: [${orderBy}], first: ${limit}) {
      totalCount
      edges {
        node {
          id title type channelId videoId url views likes comments
          engagementRatePercent publishedDate duration tags workstream
          status notes transcript summary thumbnailUrl description
          captionAvailable language definition topicCategories
          categoryId durationType createdAt updatedAt
        }
      }
    }
  }`
}

const durationTypeOptions = ["Short", "Full"]

function formatDuration(minutes: number | null): string {
  if (minutes == null) return "\u2014"
  const totalSeconds = Math.round(minutes * 60)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  return `${m}:${String(s).padStart(2, "0")}`
}

function DurationBar({ minutes, durationType }: { minutes: number | null; durationType: string | null }) {
  if (minutes == null) return <span className="text-muted-foreground">{"\u2014"}</span>
  const isShort = durationType === "Short"
  const maxMinutes = isShort ? 3 : 120
  const pct = Math.min((minutes / maxMinutes) * 100, 100)
  const barColor = isShort ? "bg-pink-500" : "bg-sky-500"
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <span className="text-xs whitespace-nowrap tabular-nums">{formatDuration(minutes)}</span>
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function ratio(num: number | null, denom: number | null): number | null {
  if (num == null || denom == null || denom === 0) return null
  return num / denom
}

function formatPercent(n: number | null) {
  if (n == null) return "\u2014"
  return `${(n * 100).toFixed(2)}%`
}

// Color classes for engagement percentages
function percentColor(n: number | null, tiers: [number, number, number, number]): string {
  if (n == null) return "text-muted-foreground"
  const pct = n * 100
  const [great, good, ok, low] = tiers
  if (pct >= great) return "text-emerald-600 dark:text-emerald-400"
  if (pct >= good) return "text-green-600 dark:text-green-400"
  if (pct >= ok) return "text-amber-600 dark:text-amber-400"
  if (pct >= low) return "text-orange-600 dark:text-orange-400"
  return "text-red-600 dark:text-red-400"
}

const LIKE_TIERS: [number, number, number, number] = [5, 3.5, 2, 1]
const COMMENT_TIERS: [number, number, number, number] = [1, 0.4, 0.15, 0.05]
const ENGAGE_TIERS: [number, number, number, number] = [8, 5, 3, 1]

function formatViews(n: number | string | null) {
  if (n == null) return "\u2014"
  return Number(n).toLocaleString()
}

function formatNumber(n: number | string | null) {
  if (n == null) return "\u2014"
  return Number(n).toLocaleString()
}

function ageShort(d: string | null): string {
  if (!d) return "\u2014"
  const seconds = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
  if (seconds < 60) return "now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hr`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} day`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks} wk`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} mth`
  const years = Math.floor(months / 12)
  return `${years} yr`
}

function formatDate(d: string | null) {
  if (!d) return "\u2014"
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

function timeAgo(d: string | null): string {
  if (!d) return ""
  const now = Date.now()
  const then = new Date(d).getTime()
  const seconds = Math.floor((now - then) / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} day${days !== 1 ? "s" : ""} ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} month${months !== 1 ? "s" : ""} ago`
  const years = Math.floor(months / 12)
  return `${years} year${years !== 1 ? "s" : ""} ago`
}

interface Filters {
  search: string
  creator: string
  durationType: string
}

const emptyFilters: Filters = {
  search: "",
  creator: "",
  durationType: "",
}

function FilterSelect({
  label, value, options, onChange,
}: { label: string; value: string; options: { value: string; label: string }[] | string[]; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground min-w-[100px]"
    >
      <option value="">{label}</option>
      {options.map((o) => {
        const val = typeof o === "string" ? o : o.value
        const lab = typeof o === "string" ? o : o.label
        return <option key={val} value={val}>{lab}</option>
      })}
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

const PRIMARY_COL_COUNT = 11

export default function VideosPage() {
  const graphqlClient = useGraphQLClient()
  const searchParams = useSearchParams()
  const [videos, setVideos] = useState<Video[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [creators, setCreators] = useState<Creator[]>([])
  const [loading, setLoading] = useState(true)
  const [pageSize, setPageSize] = useState<PageSize>(30)
  const [sortKey, setSortKey] = useState<SortKey | null>("publishedDate")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [filters, setFilters] = useState<Filters>(() => ({
    ...emptyFilters,
    creator: searchParams.get("creator") || "",
  }))
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [allExpanded, setAllExpanded] = useState(false)
  const [gridView, setGridView] = useState(() => {
    try { return localStorage.getItem("yt-grid-view") === "1" } catch { return false }
  })
  function toggleGridView() {
    setGridView((v) => {
      const next = !v
      try { localStorage.setItem("yt-grid-view", next ? "1" : "0") } catch {}
      return next
    })
  }

  // Fetch creators once
  useEffect(() => {
    graphqlClient
      .request<{ youtubeCreatorsCollection: { edges: { node: Creator }[] } }>(CREATORS_LOOKUP_QUERY)
      .then((data) => setCreators(extractNodes(data.youtubeCreatorsCollection)))
      .catch((err) => console.error("Error loading creators:", err))
  }, [graphqlClient])

  // Fetch videos — re-runs when any server-side filter, page size, or sort changes
  const { creator: creatorFilter, durationType: dtFilter } = filters
  const serverSortField = sortKey ? SERVER_SORT_FIELDS[sortKey] : undefined
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    graphqlClient
      .request<{ youtubeVideosCollection: { totalCount: number; edges: { node: Video }[] } }>(
        buildVideosQuery(
          {
            channelId: creatorFilter || undefined,
            durationType: dtFilter || undefined,
          },
          pageSize,
          serverSortField,
          sortDir,
        )
      )
      .then((data) => {
        if (!cancelled) {
          setVideos(extractNodes(data.youtubeVideosCollection))
          setTotalCount(data.youtubeVideosCollection.totalCount)
        }
      })
      .catch((err) => {
        if (!cancelled) console.error("Error loading videos:", err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [graphqlClient, creatorFilter, dtFilter, pageSize, serverSortField, sortDir])

  const creatorLookup = useMemo(() => {
    const map: Record<string, string> = {}
    creators.forEach((c) => { map[c.channelId] = c.title })
    return map
  }, [creators])

  const creatorAvatarLookup = useMemo(() => {
    const map: Record<string, string> = {}
    creators.forEach((c) => { if (c.avatarUrl) map[c.channelId] = c.avatarUrl })
    return map
  }, [creators])

  const creatorOptions = useMemo(() =>
    creators.map((c) => ({ value: c.channelId, label: c.title })),
    [creators]
  )

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
      setExpanded(new Set(sorted.map((v) => v.id)))
      setAllExpanded(true)
    }
  }

  function isExpanded(id: string) {
    return allExpanded ? !expanded.has(id) : expanded.has(id)
  }

  const hasFilters = Object.values(filters).some((v) => v !== "")

  const filtered = useMemo(() => {
    if (!filters.search) return videos
    const q = filters.search.toLowerCase()
    return videos.filter(
      (v) =>
        v.title.toLowerCase().includes(q) ||
        (creatorLookup[v.channelId] || "").toLowerCase().includes(q) ||
        v.tags?.some((t) => t.toLowerCase().includes(q)) ||
        v.notes?.toLowerCase().includes(q)
    )
  }, [videos, filters.search, creatorLookup])

  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    // Server-side sorted columns — already ordered by the DB, skip client re-sort
    if (SERVER_SORT_FIELDS[sortKey]) return filtered
    // Client-side sort for computed columns only
    return [...filtered].sort((a, b) => {
      let av: unknown, bv: unknown
      if (sortKey === "creatorName") {
        av = creatorLookup[a.channelId] || ""
        bv = creatorLookup[b.channelId] || ""
      } else if (sortKey === "likesPerView") {
        av = ratio(a.likes, a.views)
        bv = ratio(b.likes, b.views)
      } else if (sortKey === "commentsPerView") {
        av = ratio(a.comments, a.views)
        bv = ratio(b.comments, b.views)
      } else {
        av = a[sortKey]
        bv = b[sortKey]
      }
      const cmp = compareValues(av, bv)
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir, creatorLookup])

  return (
    <>
      <PageHeader section="YouTube" sectionHref="/research/creators" page="Videos" />
      <div className="flex-1 p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">YouTube Videos</h1>
          <button
            onClick={toggleGridView}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
              gridView
                ? "bg-blue-500 text-white shadow-sm hover:bg-blue-600"
                : "bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-400 dark:hover:bg-blue-900"
            }`}
          >
            <LayoutGrid className="size-3.5" />
            Grid View
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Input
            placeholder="Search videos..."
            value={filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
            className="h-8 w-[200px] text-xs"
          />
          <div className="inline-flex items-center gap-0.5">
            <button
              onClick={() => {
                const idx = creatorOptions.findIndex((o) => o.value === filters.creator)
                // If no creator selected or at first, wrap to last
                const prev = idx <= 0 ? creatorOptions.length - 1 : idx - 1
                setFilter("creator", creatorOptions[prev]?.value ?? "")
              }}
              disabled={creatorOptions.length === 0}
              className="inline-flex items-center justify-center size-8 rounded-md border border-input bg-background text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-40"
              aria-label="Previous creator"
            >
              <ChevronLeft className="size-3.5" />
            </button>
            <FilterSelect label="Creator" value={filters.creator} options={creatorOptions} onChange={(v) => setFilter("creator", v)} />
            <button
              onClick={() => {
                const idx = creatorOptions.findIndex((o) => o.value === filters.creator)
                // If no creator selected or at last, wrap to first
                const next = idx < 0 || idx >= creatorOptions.length - 1 ? 0 : idx + 1
                setFilter("creator", creatorOptions[next]?.value ?? "")
              }}
              disabled={creatorOptions.length === 0}
              className="inline-flex items-center justify-center size-8 rounded-md border border-input bg-background text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-40"
              aria-label="Next creator"
            >
              <ChevronRight className="size-3.5" />
            </button>
          </div>
          <FilterSelect label="Type" value={filters.durationType} options={durationTypeOptions} onChange={(v) => setFilter("durationType", v)} />
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
              {sorted.length.toLocaleString()} of {totalCount.toLocaleString()} videos
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Show</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value) as PageSize)}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
              >
                {PAGE_SIZE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : videos.length === 0 ? (
          <p className="text-muted-foreground">No videos found.</p>
        ) : gridView ? (
          <div className="grid gap-x-4 gap-y-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sorted.map((v) => {
              const creatorName = creatorLookup[v.channelId] || v.channelId
              const avatar = creatorAvatarLookup[v.channelId]
              return (
                <a
                  key={v.id}
                  href={v.url || undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`group rounded-2xl p-2 -m-2 transition-colors ${getCreatorCardHover(v.channelId)}`}
                >
                  {/* Thumbnail */}
                  <div className="aspect-video bg-muted rounded-xl overflow-hidden relative">
                    {v.thumbnailUrl ? (
                      <img src={v.thumbnailUrl} alt={v.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No thumbnail</div>
                    )}
                    {v.duration != null && (
                      <span className="absolute bottom-1.5 right-1.5 rounded-md bg-black/80 px-1.5 py-0.5 text-[11px] font-medium text-white tabular-nums">
                        {formatDuration(v.duration)}
                      </span>
                    )}
                  </div>
                  {/* Info row — avatar + text */}
                  <div className="flex gap-3 mt-3">
                    {/* Channel avatar */}
                    {avatar ? (
                      <img src={avatar} alt={creatorName} className="size-9 rounded-full shrink-0 mt-0.5" />
                    ) : (
                      <div className="size-9 rounded-full shrink-0 mt-0.5 bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                        {creatorName.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                        {v.title}
                      </h3>
                      <div className="mt-1"><CreatorBadge name={creatorName} channelId={v.channelId} /></div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-xs text-muted-foreground">
                          {formatViews(v.views)} views{v.publishedDate ? ` \u00b7 ${timeAgo(v.publishedDate)}` : ""}
                        </span>
                        <DurationTypeBadge value={v.durationType} />
                      </div>
                    </div>
                  </div>
                </a>
              )
            })}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <SortableHead label="Title" sortKey="title" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Creator" sortKey="creatorName" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Views" sortKey="views" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
                  <SortableHead label="Likes" sortKey="likes" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
                  <SortableHead label="Like%" sortKey="likesPerView" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
                  <SortableHead label="Comment%" sortKey="commentsPerView" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
                  <SortableHead label="Duration" sortKey="duration" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Type" sortKey="durationType" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Age" sortKey="publishedDate" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((v) => {
                  const open = isExpanded(v.id)
                  const creatorName = creatorLookup[v.channelId] || v.channelId
                  return (
                    <React.Fragment key={v.id}>
                      <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => toggleRow(v.id)}>
                        <TableCell className="w-8 px-2">
                          {open ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />}
                        </TableCell>
                        <TableCell className="font-medium max-w-[300px]">
                          <span className="line-clamp-1">{v.title}</span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap"><CreatorBadge name={creatorName} channelId={v.channelId} /></TableCell>
                        <TableCell className="text-right tabular-nums">{formatViews(v.views)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatNumber(v.likes)}</TableCell>
                        <TableCell className={`text-right tabular-nums font-medium ${percentColor(ratio(v.likes, v.views), LIKE_TIERS)}`}>{formatPercent(ratio(v.likes, v.views))}</TableCell>
                        <TableCell className={`text-right tabular-nums font-medium ${percentColor(ratio(v.comments, v.views), COMMENT_TIERS)}`}>{formatPercent(ratio(v.comments, v.views))}</TableCell>
                        <TableCell><DurationBar minutes={v.duration} durationType={v.durationType} /></TableCell>
                        <TableCell><DurationTypeBadge value={v.durationType} /></TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">{ageShort(v.publishedDate)}</TableCell>
                      </TableRow>
                      {open && (
                        <TableRow className="bg-muted/30 hover:bg-muted/40">
                          <TableCell />
                          <TableCell colSpan={PRIMARY_COL_COUNT - 1}>
                            {/* Full title + thumbnail header */}
                            <div className="flex items-start gap-4 pt-2 pb-3 border-b border-border/50 mb-3">
                              {v.thumbnailUrl && (
                                <img src={v.thumbnailUrl} alt={v.title} className="h-28 rounded-md shrink-0" />
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-3">
                                  <h3 className="text-sm font-semibold leading-snug">{v.title}</h3>
                                  <span className="shrink-0 text-sm font-medium tabular-nums">{formatDuration(v.duration)}</span>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                                  <CreatorBadge name={creatorName} channelId={v.channelId} />
                                  <span>{ageShort(v.publishedDate)} ago</span>
                                  {v.durationType && <DurationTypeBadge value={v.durationType} />}
                                  {v.url && (
                                    <a href={v.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline" onClick={(e) => e.stopPropagation()}>
                                      Watch on YouTube
                                    </a>
                                  )}
                                </div>
                                <div className="grid grid-cols-[5rem_6rem_6rem_6rem] gap-y-0.5 mt-1.5 text-xs">
                                  <span className="text-muted-foreground">Views</span>
                                  <span className="font-medium tabular-nums">{formatViews(v.views)}</span>
                                  <span className="text-muted-foreground">Engagement</span>
                                  <span className={`font-medium tabular-nums ${percentColor(v.engagementRatePercent != null ? v.engagementRatePercent / 100 : null, ENGAGE_TIERS)}`}>{v.engagementRatePercent != null ? `${Number(v.engagementRatePercent).toFixed(1)}%` : "\u2014"}</span>
                                  <span className="text-muted-foreground">Likes</span>
                                  <span className="font-medium tabular-nums">{formatNumber(v.likes)}</span>
                                  <span className="text-muted-foreground">Like%</span>
                                  <span className={`font-medium tabular-nums ${percentColor(ratio(v.likes, v.views), LIKE_TIERS)}`}>{formatPercent(ratio(v.likes, v.views))}</span>
                                  <span className="text-muted-foreground">Comments</span>
                                  <span className="font-medium tabular-nums">{formatNumber(v.comments)}</span>
                                  <span className="text-muted-foreground">Comment%</span>
                                  <span className={`font-medium tabular-nums ${percentColor(ratio(v.comments, v.views), COMMENT_TIERS)}`}>{formatPercent(ratio(v.comments, v.views))}</span>
                                </div>
                              </div>
                            </div>

                            {/* Metadata grid */}
                            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-6 gap-y-3 text-sm">
                              <Detail label="Type" value={v.type || "\u2014"} />
                              <Detail label="Video ID" value={v.videoId} />
                              <Detail label="Definition" value={v.definition?.toUpperCase() || "\u2014"} />
                              <Detail label="Language" value={v.language || "\u2014"} />
                              <Detail label="Captions" value={v.captionAvailable ? "Yes" : "No"} />
                              <Detail label="Category ID" value={v.categoryId != null ? String(v.categoryId) : "\u2014"} />
                            </div>

                            {/* Tags & Topics */}
                            {((v.tags && v.tags.length > 0) || (v.topicCategories && v.topicCategories.length > 0)) && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 mt-3 pt-3 border-t border-border/50 text-sm">
                                {v.tags && v.tags.length > 0 && (
                                  <div>
                                    <span className="text-xs text-muted-foreground">Tags</span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {v.tags.map((t) => (
                                        <TagBadge key={t} value={t} />
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {v.topicCategories && v.topicCategories.length > 0 && (
                                  <div>
                                    <span className="text-xs text-muted-foreground">Topics</span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {v.topicCategories.map((t) => (
                                        <TopicBadge key={t} value={t} />
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Notes */}
                            {v.notes && (
                              <div className="mt-3 pt-3 border-t border-border/50 text-sm">
                                <span className="text-xs text-muted-foreground">Notes</span>
                                <p className="text-xs mt-0.5">{v.notes}</p>
                              </div>
                            )}

                            {/* Collapsible long text */}
                            {v.description && (
                              <details className="mt-3 pt-3 border-t border-border/50">
                                <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                                  Description
                                </summary>
                                <div className="mt-2 rounded-md border bg-background/50 p-3 max-h-48 overflow-y-auto">
                                  <p className="text-xs whitespace-pre-wrap leading-relaxed">{v.description}</p>
                                </div>
                              </details>
                            )}
                            {v.summary && (
                              <details className="mt-2">
                                <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                                  Summary
                                </summary>
                                <div className="mt-2 rounded-md border bg-background/50 p-3 max-h-48 overflow-y-auto overflow-x-hidden">
                                  <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{v.summary}</p>
                                </div>
                              </details>
                            )}
                            {v.transcript && (
                              <details className="mt-2">
                                <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                                  Transcript
                                </summary>
                                <div className="mt-2 rounded-md border bg-background/50 p-3 max-h-64 overflow-y-auto overflow-x-hidden">
                                  <p className="text-xs whitespace-pre-wrap break-words leading-relaxed">{v.transcript}</p>
                                </div>
                              </details>
                            )}
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

function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  if (typeof a === "number" && typeof b === "number") return a - b
  if (typeof a === "string" && typeof b === "string") return a.localeCompare(b)
  return 0
}

function Detail({ label, value, children, wide }: { label: string; value?: string; children?: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-2" : ""}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="mt-0.5">{children || <span className="text-xs">{value}</span>}</div>
    </div>
  )
}
