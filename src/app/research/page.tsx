"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { gql } from "graphql-request"
import { extractNodes } from "@/lib/graphql"
import { useGraphQLClient } from "@/hooks/use-graphql"
import { supabase } from "@/lib/supabase-client"
import { PageHeader } from "@/components/page-header"
import { Youtube, Video, Clock, FileText, Eye, ThumbsUp, MessageSquare, Star } from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts"

// ─── Single query: fetch all rows, compute aggregates client-side ────────────
interface Creator {
  id: string
  title: string
  channelId: string
}

interface VideoRow {
  id: string
  channelId: string
  views: number | string | null
  likes: number | string | null
  comments: number | string | null
  duration: number | string | null
  durationType: string | null
  transcript: string | null
  summary: string | null
}

const DATA_QUERY = gql`
  query {
    youtubeCreatorsCollection(orderBy: [{ title: AscNullsLast }], first: 1000) {
      totalCount
      edges { node { id title channelId } }
    }
    starredCreatorsCollection: youtubeCreatorsCollection(filter: { isStarred: { eq: true } }) {
      totalCount
    }
    youtubeVideosCollection(first: 1000) {
      totalCount
      edges {
        node {
          id channelId views likes comments duration
          durationType transcript summary
        }
      }
    }
    starredVideosCollection: youtubeVideosCollection(filter: { isStarred: { eq: true } }) {
      totalCount
    }
  }
`

// ─── Helpers ────────────────────────────────────────────────────────────────
function toNum(v: unknown): number {
  if (v == null) return 0
  const n = Number(v)
  return isNaN(n) ? 0 : n
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

function formatDuration(totalMinutes: number): string {
  if (!totalMinutes || isNaN(totalMinutes)) return "0m"
  const hours = Math.floor(totalMinutes / 60)
  const minutes = Math.round(totalMinutes % 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

const PIE_COLORS = { Short: "#ec4899", Full: "#0ea5e9" }

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "content", label: "Content" },
  { key: "engagement", label: "Engagement" },
  { key: "coverage", label: "Coverage" },
] as const

type TabKey = (typeof TABS)[number]["key"]

// ─── Component ──────────────────────────────────────────────────────────────
export default function YouTubeDashboard() {
  const graphqlClient = useGraphQLClient()
  const [activeTab, setActiveTab] = useState<TabKey>("overview")

  const [creators, setCreators] = useState<Creator[]>([])
  const [videos, setVideos] = useState<VideoRow[]>([])
  const [totalCreators, setTotalCreators] = useState(0)
  const [totalVideos, setTotalVideos] = useState(0)
  const [starredCreators, setStarredCreators] = useState(0)
  const [starredVideos, setStarredVideos] = useState(0)
  const [dbStats, setDbStats] = useState<{
    total_views: number; total_likes: number; total_comments: number
    total_duration: number; short_count: number; full_count: number
    with_transcript: number; total_videos: number
  } | null>(null)
  const [durationHistogram, setDurationHistogram] = useState<{ minute_bucket: number; video_count: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    graphqlClient
      .request<{
        youtubeCreatorsCollection: { totalCount: number; edges: { node: Creator }[] }
        starredCreatorsCollection: { totalCount: number }
        youtubeVideosCollection: { totalCount: number; edges: { node: VideoRow }[] }
        starredVideosCollection: { totalCount: number }
      }>(DATA_QUERY)
      .then((data) => {
        setCreators(extractNodes(data.youtubeCreatorsCollection))
        setVideos(extractNodes(data.youtubeVideosCollection))
        setTotalCreators(data.youtubeCreatorsCollection.totalCount)
        setTotalVideos(data.youtubeVideosCollection.totalCount)
        setStarredCreators(data.starredCreatorsCollection.totalCount)
        setStarredVideos(data.starredVideosCollection.totalCount)
      })
      .catch((err) => { console.error("Error loading overview:", err); setError(true) })
      .finally(() => setLoading(false))

    supabase
      .schema("research")
      .rpc("get_youtube_dashboard_stats")
      .then(({ data, error }) => {
        if (error) { console.error("Error loading dashboard stats:", error); return }
        if (data && data.length > 0) setDbStats(data[0])
      })

    supabase
      .schema("research")
      .rpc("get_video_duration_histogram")
      .then(({ data, error }) => {
        if (error) { console.error("Error loading duration histogram:", error); return }
        if (data) {
          // Fill in missing buckets with 0
          const map = new Map<number, number>()
          for (const row of data as { minute_bucket: number; video_count: number }[]) {
            map.set(row.minute_bucket, Number(row.video_count))
          }
          const full: { minute_bucket: number; video_count: number }[] = []
          for (let i = 1; i <= 21; i++) {
            full.push({ minute_bucket: i, video_count: map.get(i) || 0 })
          }
          setDurationHistogram(full)
        }
      })
  }, [graphqlClient])

  // ─── Overview computed values (prefer DB-level aggregates, fall back to client) ─
  const totalViews = dbStats?.total_views ?? videos.reduce((s, v) => s + toNum(v.views), 0)
  const totalLikes = dbStats?.total_likes ?? videos.reduce((s, v) => s + toNum(v.likes), 0)
  const totalComments = dbStats?.total_comments ?? videos.reduce((s, v) => s + toNum(v.comments), 0)
  const totalDuration = dbStats?.total_duration ?? videos.reduce((s, v) => s + toNum(v.duration), 0)
  const shortVideos = dbStats?.short_count ?? videos.filter((v) => v.durationType === "Short").length
  const fullVideos = (dbStats?.full_count ?? totalVideos - shortVideos)
  const withTranscript = dbStats?.with_transcript ?? videos.filter((v) => v.transcript).length
  const videoCount = dbStats?.total_videos ?? totalVideos
  const transcriptPct = videoCount > 0 ? Math.round((withTranscript / videoCount) * 100) : 0
  const shortPct = videoCount > 0 ? Math.round((shortVideos / videoCount) * 100) : 0

  const shortFullPie = [
    { name: "Short", value: shortVideos },
    { name: "Full", value: fullVideos },
  ]

  const summaryCards = [
    { label: "Creators", value: totalCreators.toLocaleString(), sub: `${starredCreators} starred`, icon: Youtube, color: "text-red-500", bg: "bg-red-50 dark:bg-red-950", href: "/research/creators" },
    { label: "Videos", value: totalVideos.toLocaleString(), sub: `${starredVideos} starred`, icon: Video, color: "text-sky-500", bg: "bg-sky-50 dark:bg-sky-950", href: "/research/videos" },
    { label: "Total Views", value: formatNumber(totalViews), icon: Eye, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950" },
    { label: "Total Duration", value: formatDuration(totalDuration), icon: Clock, color: "text-violet-500", bg: "bg-violet-50 dark:bg-violet-950" },
    { label: "Total Likes", value: formatNumber(totalLikes), icon: ThumbsUp, color: "text-pink-500", bg: "bg-pink-50 dark:bg-pink-950" },
    { label: "Total Comments", value: formatNumber(totalComments), icon: MessageSquare, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950" },
    { label: "Transcripts", value: `${transcriptPct}%`, sub: `${withTranscript} of ${videoCount}`, icon: FileText, color: "text-teal-500", bg: "bg-teal-50 dark:bg-teal-950" },
    { label: "Shorts", value: `${shortPct}%`, sub: `${shortVideos} of ${videoCount}`, icon: Video, color: "text-pink-500", bg: "bg-pink-50 dark:bg-pink-950" },
  ]

  // ─── Detail computed values (from client-side aggregation of rows) ──────
  const videosPerCreator = useMemo(() => {
    const counts: Record<string, number> = {}
    videos.forEach((v) => { counts[v.channelId] = (counts[v.channelId] || 0) + 1 })
    return creators
      .map((c) => ({ name: c.title, videos: counts[c.channelId] || 0 }))
      .sort((a, b) => b.videos - a.videos)
      .slice(0, 20)
  }, [creators, videos])

  const viewsPerCreator = useMemo(() => {
    const sums: Record<string, number> = {}
    videos.forEach((v) => { sums[v.channelId] = (sums[v.channelId] || 0) + toNum(v.views) })
    return creators
      .map((c) => ({ name: c.title, views: sums[c.channelId] || 0 }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 20)
  }, [creators, videos])

  const engagementPerCreator = useMemo(() => {
    const agg: Record<string, { likes: number; comments: number; views: number }> = {}
    videos.forEach((v) => {
      if (!agg[v.channelId]) agg[v.channelId] = { likes: 0, comments: 0, views: 0 }
      agg[v.channelId].likes += toNum(v.likes)
      agg[v.channelId].comments += toNum(v.comments)
      agg[v.channelId].views += toNum(v.views)
    })
    return creators
      .map((c) => {
        const d = agg[c.channelId] || { likes: 0, comments: 0, views: 0 }
        const engRate = d.views > 0 ? ((d.likes + d.comments) / d.views) * 100 : 0
        return { name: c.title, engagement: Math.round(engRate * 10) / 10 }
      })
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, 20)
  }, [creators, videos])

  const likesPerCreator = useMemo(() => {
    const sums: Record<string, number> = {}
    videos.forEach((v) => { sums[v.channelId] = (sums[v.channelId] || 0) + toNum(v.likes) })
    return creators
      .map((c) => ({ name: c.title, likes: sums[c.channelId] || 0 }))
      .sort((a, b) => b.likes - a.likes)
      .slice(0, 20)
  }, [creators, videos])

  const commentsPerCreator = useMemo(() => {
    const sums: Record<string, number> = {}
    videos.forEach((v) => { sums[v.channelId] = (sums[v.channelId] || 0) + toNum(v.comments) })
    return creators
      .map((c) => ({ name: c.title, comments: sums[c.channelId] || 0 }))
      .sort((a, b) => b.comments - a.comments)
      .slice(0, 20)
  }, [creators, videos])

  const shortFullPerCreator = useMemo(() => {
    const agg: Record<string, { short: number; full: number }> = {}
    videos.forEach((v) => {
      if (!agg[v.channelId]) agg[v.channelId] = { short: 0, full: 0 }
      if (v.durationType === "Short") agg[v.channelId].short++
      else agg[v.channelId].full++
    })
    return creators
      .map((c) => {
        const d = agg[c.channelId] || { short: 0, full: 0 }
        return { name: c.title, Short: d.short, Full: d.full, total: d.short + d.full }
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 20)
  }, [creators, videos])

  const durationPerCreator = useMemo(() => {
    const sums: Record<string, number> = {}
    videos.forEach((v) => { sums[v.channelId] = (sums[v.channelId] || 0) + toNum(v.duration) })
    return creators
      .map((c) => ({ name: c.title, duration: Math.round(sums[c.channelId] || 0) }))
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 20)
  }, [creators, videos])

  const transcriptPerCreator = useMemo(() => {
    const agg: Record<string, { total: number; withTranscript: number }> = {}
    videos.forEach((v) => {
      if (!agg[v.channelId]) agg[v.channelId] = { total: 0, withTranscript: 0 }
      agg[v.channelId].total++
      if (v.transcript) agg[v.channelId].withTranscript++
    })
    return creators
      .map((c) => {
        const d = agg[c.channelId] || { total: 0, withTranscript: 0 }
        const pct = d.total > 0 ? Math.round((d.withTranscript / d.total) * 100) : 0
        return { name: c.title, coverage: pct, withTranscript: d.withTranscript, total: d.total }
      })
      .sort((a, b) => b.coverage - a.coverage)
      .slice(0, 20)
  }, [creators, videos])

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <>
      <PageHeader section="YouTube" sectionHref="/research" page="Dashboard" />

      {/* Sub-dashboard tabs */}
      <div className="flex items-center gap-1 border-b px-6 pt-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-t-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 p-6">
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : error ? (
          <p className="text-muted-foreground">Failed to load dashboard data.</p>
        ) : (
          <>
            {/* ── Overview ── */}
            {activeTab === "overview" && (
              <>
                <div className="grid gap-4 grid-cols-2 md:grid-cols-4 mb-8">
                  {summaryCards.map((card) => (
                    <CardWrapper key={card.label} href={card.href}>
                      <div className={`rounded-lg border p-4 ${card.bg} hover:shadow-md transition-shadow h-full`}>
                        <div className="flex items-center gap-2 mb-2">
                          <card.icon className={`size-4 ${card.color}`} />
                          <span className="text-xs font-medium text-muted-foreground">{card.label}</span>
                        </div>
                        <div className="text-2xl font-bold">{card.value}</div>
                        {card.sub && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            {card.sub.includes("starred") && <Star className="size-3 fill-yellow-400 text-yellow-400" />}
                            {card.sub}
                          </div>
                        )}
                      </div>
                    </CardWrapper>
                  ))}
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="rounded-lg border p-5">
                    <h3 className="text-sm font-semibold mb-4">Shorts vs Full-Length Videos</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie data={shortFullPie} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                          {shortFullPie.map((entry) => (
                            <Cell key={entry.name} fill={PIE_COLORS[entry.name as keyof typeof PIE_COLORS] || "#999"} />
                          ))}
                        </Pie>
                        <ChartTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="rounded-lg border p-5">
                    <h3 className="text-sm font-semibold mb-4">Video Duration Distribution</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={durationHistogram} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" vertical={false} />
                        <XAxis
                          dataKey="minute_bucket"
                          tick={{ fontSize: 11 }}
                          tickFormatter={(v) => v === 21 ? "20+" : `${v}`}
                          label={{ value: "Minutes", position: "insideBottom", offset: -2, fontSize: 11 }}
                        />
                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: "0.375rem", fontSize: "0.75rem" }}
                          formatter={(v: unknown) => [Number(v).toLocaleString(), "Videos"]}
                          labelFormatter={(v) => v === 21 ? "20+ min" : `${v} min`}
                        />
                        <Bar dataKey="video_count" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}

            {/* ── Content ── */}
            {activeTab === "content" && (
              <div className="space-y-6">
                <div className="grid gap-6 lg:grid-cols-2">
                  <HorizontalBarChart title="Videos per Creator" data={videosPerCreator} dataKey="videos" color="#3b82f6" formatter={(v: number) => `${v} videos`} />
                  <HorizontalBarChart title="Total Duration per Creator (min)" data={durationPerCreator} dataKey="duration" color="#8b5cf6" formatter={(v: number) => formatDuration(v)} />
                </div>
                <div className="rounded-lg border p-5">
                  <h3 className="text-sm font-semibold mb-4">Shorts vs Full-Length by Creator</h3>
                  <ResponsiveContainer width="100%" height={Math.max(shortFullPerCreator.length * 32 + 40, 200)}>
                    <BarChart data={shortFullPerCreator} layout="vertical" margin={{ left: 120, right: 20, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={115} />
                      <ChartTooltip />
                      <Legend wrapperStyle={{ fontSize: "0.75rem" }} />
                      <Bar dataKey="Short" stackId="a" fill="#ec4899" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="Full" stackId="a" fill="#0ea5e9" radius={[0, 2, 2, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* ── Engagement ── */}
            {activeTab === "engagement" && (
              <div className="grid gap-6 lg:grid-cols-2">
                <HorizontalBarChart title="Total Views per Creator" data={viewsPerCreator} dataKey="views" color="#10b981" formatter={(v: number) => formatNumber(v)} />
                <HorizontalBarChart title="Total Likes per Creator" data={likesPerCreator} dataKey="likes" color="#ec4899" formatter={(v: number) => formatNumber(v)} />
                <HorizontalBarChart title="Total Comments per Creator" data={commentsPerCreator} dataKey="comments" color="#f59e0b" formatter={(v: number) => formatNumber(v)} />
                <HorizontalBarChart title="Engagement Rate by Creator" data={engagementPerCreator} dataKey="engagement" color="#6366f1" formatter={(v: number) => `${v}%`} unit="%" />
              </div>
            )}

            {/* ── Coverage ── */}
            {activeTab === "coverage" && (
              <div className="space-y-6">
                <div className="rounded-lg border p-5">
                  <h3 className="text-sm font-semibold mb-4">Transcript Coverage by Creator</h3>
                  <ResponsiveContainer width="100%" height={Math.max(transcriptPerCreator.length * 32 + 40, 200)}>
                    <BarChart data={transcriptPerCreator} layout="vertical" margin={{ left: 120, right: 20, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={115} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: "0.375rem", fontSize: "0.75rem" }}
                        formatter={(v: unknown) => [`${v}%`, "Coverage"]}
                      />
                      <Bar dataKey="coverage" fill="#14b8a6" radius={[0, 2, 2, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                  {creators.slice(0, 20).map((c) => {
                    const cVideos = videos.filter((v) => v.channelId === c.channelId)
                    const hasTranscript = cVideos.filter((v) => v.transcript).length
                    const hasSummary = cVideos.filter((v) => v.summary).length
                    const pct = cVideos.length > 0 ? Math.round((hasTranscript / cVideos.length) * 100) : 0
                    const sumPct = cVideos.length > 0 ? Math.round((hasSummary / cVideos.length) * 100) : 0
                    return (
                      <div key={c.id} className="rounded-lg border p-4">
                        <div className="text-sm font-medium truncate mb-2">{c.title}</div>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Transcripts</span>
                            <span className="font-bold text-foreground">{pct}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-teal-500" style={{ width: `${pct}%` }} />
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Summaries</span>
                            <span className="font-bold text-foreground">{sumPct}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-violet-500" style={{ width: `${sumPct}%` }} />
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {hasTranscript}/{cVideos.length} transcripts, {hasSummary}/{cVideos.length} summaries
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}

function CardWrapper({ href, children }: { href?: string; children: React.ReactNode }) {
  if (href) return <Link href={href}>{children}</Link>
  return <>{children}</>
}

function ChartTooltip() {
  return (
    <Tooltip
      contentStyle={{ backgroundColor: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: "0.375rem", fontSize: "0.75rem" }}
    />
  )
}

function HorizontalBarChart({
  title, data, dataKey, color, formatter, unit,
}: {
  title: string
  data: { name: string; [key: string]: string | number }[]
  dataKey: string
  color: string
  formatter?: (v: number) => string
  unit?: string
}) {
  return (
    <div className="rounded-lg border p-5">
      <h3 className="text-sm font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={Math.max(data.length * 32 + 40, 200)}>
        <BarChart data={data} layout="vertical" margin={{ left: 120, right: 20, top: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} unit={unit} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={115} />
          <Tooltip
            contentStyle={{ backgroundColor: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: "0.375rem", fontSize: "0.75rem" }}
            formatter={formatter ? (v: unknown) => [formatter(v as number), title.split(" ")[0]] : undefined}
          />
          <Bar dataKey={dataKey} fill={color} radius={[0, 2, 2, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
