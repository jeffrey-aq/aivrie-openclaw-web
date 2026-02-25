"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { gql } from "graphql-request"
import { extractNodes } from "@/lib/graphql"
import { useGraphQLClient } from "@/hooks/use-graphql"
import { PageHeader } from "@/components/page-header"
import { ArrowUp, ArrowDown, ArrowUpDown, X, ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown } from "lucide-react"
import {
  WorkstreamBadge,
  VideoStatusBadge,
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
  createdAt: string | null
  updatedAt: string | null
}

interface Creator {
  channelId: string
  title: string
}

const VIDEOS_QUERY = gql`
  query {
    youtubeVideosCollection(orderBy: [{ publishedDate: DescNullsLast }]) {
      edges {
        node {
          id
          title
          type
          channelId
          videoId
          url
          views
          likes
          comments
          engagementRatePercent
          publishedDate
          duration
          tags
          workstream
          status
          notes
          transcript
          summary
          thumbnailUrl
          description
          captionAvailable
          language
          definition
          topicCategories
          categoryId
          createdAt
          updatedAt
        }
      }
    }
    youtubeCreatorsCollection(orderBy: [{ title: AscNullsLast }]) {
      edges {
        node {
          channelId
          title
        }
      }
    }
  }
`

const workstreamOptions = ["Research", "YouTube", "SaaS", "Newsletter", "Apps", "Courses"]
const statusOptions = ["Published", "Draft", "Unlisted"]

function ratio(num: number | null, denom: number | null): number | null {
  if (num == null || denom == null || denom === 0) return null
  return num / denom
}

function formatPercent(n: number | null) {
  if (n == null) return "\u2014"
  return `${(n * 100).toFixed(2)}%`
}

function formatNumber(n: number | null) {
  if (n == null) return "\u2014"
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

function formatDate(d: string | null) {
  if (!d) return "\u2014"
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

type SortDir = "asc" | "desc"
type SortKey = keyof Video | "creatorName" | "likesPerView" | "commentsPerView"

interface Filters {
  search: string
  creator: string
  workstream: string
  status: string
}

const emptyFilters: Filters = {
  search: "",
  creator: "",
  workstream: "",
  status: "",
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
  const [creators, setCreators] = useState<Creator[]>([])
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [allExpanded, setAllExpanded] = useState(false)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const data = await graphqlClient.request<{
          youtubeVideosCollection: { edges: { node: Video }[] }
          youtubeCreatorsCollection: { edges: { node: Creator }[] }
        }>(VIDEOS_QUERY)
        setVideos(extractNodes(data.youtubeVideosCollection))
        setCreators(extractNodes(data.youtubeCreatorsCollection))
      } catch (error) {
        console.error("Error loading videos:", error)
      }
      setLoading(false)
    }
    load()
  }, [graphqlClient])

  // Apply URL param filter once data is loaded
  useEffect(() => {
    if (initialized || loading) return
    const creatorParam = searchParams.get("creator")
    if (creatorParam) {
      setFilters((f) => ({ ...f, creator: creatorParam }))
      setSortKey("publishedDate")
      setSortDir("desc")
    }
    setInitialized(true)
  }, [loading, searchParams, initialized])

  const creatorLookup = useMemo(() => {
    const map: Record<string, string> = {}
    creators.forEach((c) => { map[c.channelId] = c.title })
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
    let result = videos
    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter(
        (v) =>
          v.title.toLowerCase().includes(q) ||
          (creatorLookup[v.channelId] || "").toLowerCase().includes(q) ||
          v.tags?.some((t) => t.toLowerCase().includes(q)) ||
          v.notes?.toLowerCase().includes(q)
      )
    }
    if (filters.creator) result = result.filter((v) => v.channelId === filters.creator)
    if (filters.workstream) result = result.filter((v) => v.workstream === filters.workstream)
    if (filters.status) result = result.filter((v) => v.status === filters.status)
    return result
  }, [videos, filters, creatorLookup])

  const sorted = useMemo(() => {
    if (!sortKey) return filtered
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
        <h1 className="text-2xl font-semibold mb-4">YouTube Videos</h1>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Input
            placeholder="Search videos..."
            value={filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
            className="h-8 w-[200px] text-xs"
          />
          <FilterSelect label="Creator" value={filters.creator} options={creatorOptions} onChange={(v) => setFilter("creator", v)} />
          <FilterSelect label="Workstream" value={filters.workstream} options={workstreamOptions} onChange={(v) => setFilter("workstream", v)} />
          <FilterSelect label="Status" value={filters.status} options={statusOptions} onChange={(v) => setFilter("status", v)} />
          {hasFilters && (
            <button
              onClick={() => setFilters(emptyFilters)}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <X className="size-3" /> Clear
            </button>
          )}
          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={toggleAll}
              className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors ${allExpanded ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
            >
              {allExpanded ? <ChevronsDownUp className="size-3" /> : <ChevronsUpDown className="size-3" />}
              {allExpanded ? "Collapse" : "Expand"}
            </button>
            <span className="text-xs text-muted-foreground">
              {sorted.length} of {videos.length} videos
            </span>
          </div>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : videos.length === 0 ? (
          <p className="text-muted-foreground">No videos found.</p>
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
                  <SortableHead label="Comments" sortKey="comments" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
                  <SortableHead label="Likes/View" sortKey="likesPerView" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
                  <SortableHead label="Comments/View" sortKey="commentsPerView" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
                  <SortableHead label="Published" sortKey="publishedDate" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Status" sortKey="status" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Workstream" sortKey="workstream" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
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
                        <TableCell className="whitespace-nowrap text-sm">{creatorName}</TableCell>
                        <TableCell className="text-right">{formatNumber(v.views)}</TableCell>
                        <TableCell className="text-right">{formatNumber(v.likes)}</TableCell>
                        <TableCell className="text-right">{formatNumber(v.comments)}</TableCell>
                        <TableCell className="text-right">{formatPercent(ratio(v.likes, v.views))}</TableCell>
                        <TableCell className="text-right">{formatPercent(ratio(v.comments, v.views))}</TableCell>
                        <TableCell className="whitespace-nowrap">{formatDate(v.publishedDate)}</TableCell>
                        <TableCell><VideoStatusBadge value={v.status} /></TableCell>
                        <TableCell><WorkstreamBadge value={v.workstream} /></TableCell>
                      </TableRow>
                      {open && (
                        <TableRow className="bg-muted/30 hover:bg-muted/40">
                          <TableCell />
                          <TableCell colSpan={PRIMARY_COL_COUNT - 1}>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-2 py-2 text-sm">
                              {v.thumbnailUrl && (
                                <Detail label="Thumbnail">
                                  <img src={v.thumbnailUrl} alt={v.title} className="h-16 rounded" />
                                </Detail>
                              )}
                              <Detail label="Type" value={v.type || "\u2014"} />
                              <Detail label="Video ID" value={v.videoId} />
                              <Detail label="Engagement %" value={v.engagementRatePercent != null ? `${Number(v.engagementRatePercent).toFixed(1)}%` : "\u2014"} />
                              <Detail label="Duration" value={v.duration != null ? `${v.duration}m` : "\u2014"} />
                              <Detail label="Definition" value={v.definition?.toUpperCase() || "\u2014"} />
                              <Detail label="Language" value={v.language || "\u2014"} />
                              <Detail label="Captions" value={v.captionAvailable ? "Yes" : "No"} />
                              <Detail label="Category ID" value={v.categoryId != null ? String(v.categoryId) : "\u2014"} />
                              <Detail label="Created" value={formatDate(v.createdAt)} />
                              <Detail label="Updated" value={formatDate(v.updatedAt)} />
                              {v.url && (
                                <Detail label="URL">
                                  <a href={v.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-xs break-all">
                                    {v.url}
                                  </a>
                                </Detail>
                              )}
                              <Detail label="Tags" value={v.tags && v.tags.length > 0 ? v.tags.join(", ") : "\u2014"} wide />
                              <Detail label="Topics" value={v.topicCategories && v.topicCategories.length > 0 ? v.topicCategories.join(", ") : "\u2014"} wide />
                              <Detail label="Notes" value={v.notes || "\u2014"} wide />
                            </div>
                            {v.description && (
                              <details className="mt-2">
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
