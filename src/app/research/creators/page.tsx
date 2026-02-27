"use client"

import React, { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { gql } from "graphql-request"
import { extractNodes } from "@/lib/graphql"
import { useGraphQLClient } from "@/hooks/use-graphql"
import { supabase } from "@/lib/supabase-client"
import { PageHeader } from "@/components/page-header"
import { ArrowUp, ArrowDown, ArrowUpDown, X, ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown, LayoutGrid, Star } from "lucide-react"
import {
  UploadFrequencyBadge,
  ContentTypeBadge,
  RevenueRangeBadge,
  MonetizationBadges,
  CreatorBadge,
  getCreatorCardHover,
  TagBadge,
  TopicBadge,
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
  isStarred: boolean
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
          isStarred
        }
      }
    }
  }
`

interface VideoStats {
  videoCount: number
  avgViewsShort: number | null
  avgViewsFull: number | null
  avgEngagement: number | null
  avgLikesPct: number | null
  avgCommentsPct: number | null
  freqShort: string | null
  freqFull: string | null
  avgDurationShort: number | null
  avgDurationFull: number | null
}

interface RpcVideoStats {
  channel_id: string
  video_count: number
  avg_views_short: number | null
  avg_views_full: number | null
  avg_engagement: number | null
  total_views: number
  total_likes: number
  total_comments: number
  short_count: number
  full_count: number
  short_min_date: string | null
  short_max_date: string | null
  full_min_date: string | null
  full_max_date: string | null
  avg_duration_short: number | null
  avg_duration_full: number | null
}

function percentColor(pct: number | null, tiers: [number, number]): string {
  if (pct == null) return "text-muted-foreground"
  const [good, avg] = tiers
  if (pct >= good) return "text-emerald-600 dark:text-emerald-400"
  if (pct >= avg) return "text-amber-600 dark:text-amber-400"
  return "text-red-600 dark:text-red-400"
}

const VIEWS_SUB_TIERS: [number, number] = [100, 50]
const ENGAGE_TIERS: [number, number] = [3.5, 2.5]
const LIKE_TIERS: [number, number] = [3.5, 2]
const COMMENT_TIERS: [number, number] = [0.4, 0.15]

function computeFrequency(count: number, minDate: string | null, maxDate: string | null): string | null {
  if (count < 2 || !minDate || !maxDate) return null
  const days = (new Date(maxDate).getTime() - new Date(minDate).getTime()) / (1000 * 60 * 60 * 24)
  if (days <= 0) return null
  const perWeek = (count / days) * 7
  if (perWeek >= 5) return "Daily"
  if (perWeek >= 3) return "3-4x/wk"
  if (perWeek >= 1.5) return "2x/wk"
  if (perWeek >= 0.8) return "Weekly"
  if (perWeek >= 0.4) return "Bi-Weekly"
  return "Monthly"
}

const uploadFrequencyOptions = ["Daily", "3-4x/week", "Weekly", "Bi-Weekly", "Monthly", "Irregular"]

function formatNumber(n: number | null) {
  if (n == null) return "\u2014"
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toLocaleString()
}

function formatComma(n: number | null) {
  if (n == null) return "\u2014"
  return Math.round(n).toLocaleString()
}

function formatDuration(mins: number | null) {
  if (mins == null) return "\u2014"
  const m = Math.floor(mins)
  const s = Math.round((mins - m) * 60)
  return `${m}:${s.toString().padStart(2, "0")}`
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
type SortKey = keyof Creator | "dbVideoCount" | "avgViewsShort" | "avgViewsFull" | "viewRatio" | "avgEngagement" | "avgLikesPct" | "avgCommentsPct" | "freqShort" | "freqFull" | "isStarred"

interface Filters {
  search: string
  uploadFrequency: string
}

const emptyFilters: Filters = {
  search: "",
  uploadFrequency: "",
}

function compareValues(a: unknown, b: unknown, key: SortKey): number {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  if (key === "estRevenueRange") return (revenueOrder[a as string] ?? -1) - (revenueOrder[b as string] ?? -1)
  if (typeof a === "boolean" && typeof b === "boolean") return (a ? 1 : 0) - (b ? 1 : 0)
  if (typeof a === "number" && typeof b === "number") return a - b
  if (typeof a === "string" && typeof b === "string") {
    const na = Number(a), nb = Number(b)
    if (!isNaN(na) && !isNaN(nb)) return na - nb
    return a.localeCompare(b)
  }
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
const PRIMARY_COL_COUNT = 15

export default function CreatorsPage() {
  const graphqlClient = useGraphQLClient()
  const [creators, setCreators] = useState<Creator[]>([])
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [allExpanded, setAllExpanded] = useState(false)
  const [videoStats, setVideoStats] = useState<Record<string, VideoStats>>({})
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

  async function toggleStar(id: string, current: boolean) {
    setCreators((prev) => prev.map((c) => c.id === id ? { ...c, isStarred: !current } : c))
    const { error } = await supabase.schema("research").from("youtube_creators").update({ is_starred: !current }).eq("id", id)
    if (error) {
      console.error("Error toggling star:", error)
      setCreators((prev) => prev.map((c) => c.id === id ? { ...c, isStarred: current } : c))
    }
  }

  // Fire both requests in parallel — each renders independently as it arrives
  useEffect(() => {
    graphqlClient.request<{
      youtubeCreatorsCollection: { edges: { node: Creator }[] }
    }>(CREATORS_QUERY)
      .then((data) => setCreators(extractNodes(data.youtubeCreatorsCollection)))
      .catch((error) => console.error("Error loading creators:", error))
      .finally(() => setLoading(false))

    supabase
      .schema("research")
      .rpc("get_creator_video_stats")
      .then(({ data, error }) => {
        if (error) { console.error("Error loading video stats:", error); return }
        const rows = data as RpcVideoStats[]
        const stats: Record<string, VideoStats> = {}
        for (const r of rows) {
          stats[r.channel_id] = {
            videoCount: r.video_count,
            avgViewsShort: r.avg_views_short,
            avgViewsFull: r.avg_views_full,
            avgEngagement: r.avg_engagement,
            avgLikesPct: r.total_views > 0 ? (r.total_likes / r.total_views) * 100 : null,
            avgCommentsPct: r.total_views > 0 ? (r.total_comments / r.total_views) * 100 : null,
            freqShort: computeFrequency(r.short_count, r.short_min_date, r.short_max_date),
            freqFull: computeFrequency(r.full_count, r.full_min_date, r.full_max_date),
            avgDurationShort: r.avg_duration_short,
            avgDurationFull: r.avg_duration_full,
          }
        }
        setVideoStats(stats)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setExpanded(new Set())
    setAllExpanded((v) => !v)
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
    return result
  }, [creators, filters])

  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    return [...filtered].sort((a, b) => {
      let av: unknown, bv: unknown
      if (sortKey === "dbVideoCount") {
        av = videoStats[a.channelId]?.videoCount ?? null
        bv = videoStats[b.channelId]?.videoCount ?? null
      } else if (sortKey === "avgViewsShort") {
        av = videoStats[a.channelId]?.avgViewsShort ?? null
        bv = videoStats[b.channelId]?.avgViewsShort ?? null
      } else if (sortKey === "avgViewsFull") {
        av = videoStats[a.channelId]?.avgViewsFull ?? null
        bv = videoStats[b.channelId]?.avgViewsFull ?? null
      } else if (sortKey === "avgEngagement") {
        av = videoStats[a.channelId]?.avgEngagement ?? null
        bv = videoStats[b.channelId]?.avgEngagement ?? null
      } else if (sortKey === "avgLikesPct") {
        av = videoStats[a.channelId]?.avgLikesPct ?? null
        bv = videoStats[b.channelId]?.avgLikesPct ?? null
      } else if (sortKey === "avgCommentsPct") {
        av = videoStats[a.channelId]?.avgCommentsPct ?? null
        bv = videoStats[b.channelId]?.avgCommentsPct ?? null
      } else if (sortKey === "freqShort") {
        av = videoStats[a.channelId]?.freqShort ?? null
        bv = videoStats[b.channelId]?.freqShort ?? null
      } else if (sortKey === "freqFull") {
        av = videoStats[a.channelId]?.freqFull ?? null
        bv = videoStats[b.channelId]?.freqFull ?? null
      } else if (sortKey === "viewRatio") {
        const aShort = videoStats[a.channelId]?.avgViewsShort
        const aFull = videoStats[a.channelId]?.avgViewsFull
        av = (aShort != null && aFull != null && aShort > 0) ? aFull / aShort : null
        const bShort = videoStats[b.channelId]?.avgViewsShort
        const bFull = videoStats[b.channelId]?.avgViewsFull
        bv = (bShort != null && bFull != null && bShort > 0) ? bFull / bShort : null
      } else {
        av = a[sortKey]
        bv = b[sortKey]
      }
      const cmp = compareValues(av, bv, sortKey)
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir, videoStats])

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
            placeholder="Search creators..."
            value={filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
            className="h-8 w-[200px] text-xs"
          />
          {/* Filters can be extended here */}
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
                className={`group rounded-2xl p-2 -m-2 transition-colors ${getCreatorCardHover(c.channelId)}`}
              >
                {/* Banner */}
                <div className="aspect-[16/5] bg-muted rounded-xl overflow-hidden relative">
                  {c.bannerUrl ? (
                    <img src={c.bannerUrl} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-red-500/20 via-red-500/10 to-transparent transition-transform duration-300 group-hover:scale-110" />
                  )}
                  {c.isStarred && (
                    <Star className="absolute top-1.5 right-1.5 size-4 fill-yellow-400 text-yellow-400 drop-shadow" />
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
                    <div className="mb-0.5"><CreatorBadge name={c.title} channelId={c.channelId} /></div>
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
                  <SortableHead label="" sortKey="isStarred" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="w-8" />
                  <SortableHead label="Creator" sortKey="title" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Videos" sortKey="dbVideoCount" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
                  <SortableHead label="Avg Views" sortKey="avgViewsPerVideo" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
                  <SortableHead label="Views:Sub%" sortKey="viewsToSubRatio" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
                  <SortableHead label="Short Views" sortKey="avgViewsShort" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
                  <SortableHead label="Short Freq" sortKey="freqShort" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Full Views" sortKey="avgViewsFull" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
                  <SortableHead label="Full Freq" sortKey="freqFull" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="View Ratio" sortKey="viewRatio" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
                  <SortableHead label="Engage%" sortKey="avgEngagement" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
                  <SortableHead label="Like%" sortKey="avgLikesPct" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
                  <SortableHead label="Comment%" sortKey="avgCommentsPct" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
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
                        <TableCell className="w-8 px-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleStar(c.id, c.isStarred) }}
                            className="hover:scale-110 transition-transform"
                          >
                            <Star className={`size-4 ${c.isStarred ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/40 hover:text-yellow-400"}`} />
                          </button>
                        </TableCell>
                        <TableCell className="font-medium">
                          <Link
                            href={`/research/videos?creator=${encodeURIComponent(c.channelId)}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <CreatorBadge name={c.title} channelId={c.channelId} />
                          </Link>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatNumber(videoStats[c.channelId]?.videoCount ?? null)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatComma(c.avgViewsPerVideo)}</TableCell>
                        <TableCell className={`text-right tabular-nums font-medium ${percentColor(c.viewsToSubRatio, VIEWS_SUB_TIERS)}`}>{formatPercent(c.viewsToSubRatio)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatComma(videoStats[c.channelId]?.avgViewsShort ?? null)}</TableCell>
                        <TableCell><FreqPill value={videoStats[c.channelId]?.freqShort ?? null} /></TableCell>
                        <TableCell className="text-right tabular-nums">{formatComma(videoStats[c.channelId]?.avgViewsFull ?? null)}</TableCell>
                        <TableCell><FreqPill value={videoStats[c.channelId]?.freqFull ?? null} /></TableCell>
                        <TableCell className="text-right tabular-nums">{(() => { const s = videoStats[c.channelId]?.avgViewsShort; const f = videoStats[c.channelId]?.avgViewsFull; return (s != null && f != null && s > 0) ? `${(f / s).toFixed(2)}x` : "\u2014" })()}</TableCell>
                        <TableCell className={`text-right tabular-nums font-medium ${percentColor(videoStats[c.channelId]?.avgEngagement ?? null, ENGAGE_TIERS)}`}>{videoStats[c.channelId]?.avgEngagement != null ? `${videoStats[c.channelId].avgEngagement!.toFixed(1)}%` : "\u2014"}</TableCell>
                        <TableCell className={`text-right tabular-nums font-medium ${percentColor(videoStats[c.channelId]?.avgLikesPct ?? null, LIKE_TIERS)}`}>{videoStats[c.channelId]?.avgLikesPct != null ? `${videoStats[c.channelId].avgLikesPct!.toFixed(1)}%` : "\u2014"}</TableCell>
                        <TableCell className={`text-right tabular-nums font-medium ${percentColor(videoStats[c.channelId]?.avgCommentsPct ?? null, COMMENT_TIERS)}`}>{videoStats[c.channelId]?.avgCommentsPct != null ? `${videoStats[c.channelId].avgCommentsPct!.toFixed(2)}%` : "\u2014"}</TableCell>
                      </TableRow>
                      {open && (
                        <TableRow className="bg-muted/30 hover:bg-muted/40">
                          <TableCell />
                          <TableCell colSpan={PRIMARY_COL_COUNT - 1}>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-2 py-2 text-sm">
                              {c.avatarUrl && (
                                <Detail label="Avatar">
                                  <img src={c.avatarUrl} alt={c.title} className="size-16 rounded-full" />
                                </Detail>
                              )}
                              <Detail label="Country" value={c.country || "\u2014"} />
                              <Detail label="Avg Short Length" value={formatDuration(videoStats[c.channelId]?.avgDurationShort ?? null)} />
                              <Detail label="Avg Full Length" value={formatDuration(videoStats[c.channelId]?.avgDurationFull ?? null)} />
                              <Detail label="Content Type"><ContentTypeBadge value={c.contentTypes} /></Detail>
                              <Detail label="Top Content Type" value={c.topContentType || "\u2014"} />
                              <Detail label="Est. Revenue"><RevenueRangeBadge value={c.estRevenueRange} /></Detail>
                              <Detail label="Monetization"><MonetizationBadges values={c.monetization} /></Detail>
                              <Detail label="Last Analyzed" value={formatDate(c.lastAnalyzedDate)} />
                              <Detail label="Other Ventures" value={c.otherVentures || "\u2014"} />
                              <Detail label="Keywords" wide>
                                {c.keywords && c.keywords.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">{c.keywords.map((k) => <TagBadge key={k} value={k} />)}</div>
                                ) : <span className="text-xs text-muted-foreground">{"\u2014"}</span>}
                              </Detail>
                              <Detail label="Topics" wide>
                                {c.topicCategories && c.topicCategories.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">{c.topicCategories.map((t) => <TopicBadge key={t} value={t} />)}</div>
                                ) : <span className="text-xs text-muted-foreground">{"\u2014"}</span>}
                              </Detail>
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

const FREQ_COLORS: Record<string, string> = {
  Daily: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  "3-4x/wk": "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  "2x/wk": "bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300",
  Weekly: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  "Bi-Weekly": "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  Monthly: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
}

function FreqPill({ value }: { value: string | null }) {
  if (!value) return <span className="text-muted-foreground">{"\u2014"}</span>
  const color = FREQ_COLORS[value] ?? "bg-muted text-muted-foreground"
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>{value}</span>
}

function Detail({ label, value, children, wide }: { label: string; value?: string; children?: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`min-w-0 overflow-hidden ${wide ? "col-span-2" : ""}`}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="mt-0.5 break-words whitespace-pre-wrap">{children || <span className="text-xs">{value}</span>}</div>
    </div>
  )
}
