"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { gql } from "graphql-request"
import { extractNodes } from "@/lib/graphql"
import { useGraphQLClient } from "@/hooks/use-graphql"
import { PageHeader } from "@/components/page-header"
import { Youtube, Video, Clock, FileText, Eye, ThumbsUp, MessageSquare } from "lucide-react"
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

interface Creator {
  id: string
  title: string
  channelId: string
  videoCount: number | null
  avgViewsPerVideo: number | null
  uploadFrequency: string | null
  competitiveThreat: string | null
  status: string | null
}

interface VideoRow {
  id: string
  title: string
  channelId: string
  views: number | null
  likes: number | null
  comments: number | null
  duration: number | null
  durationType: string | null
  transcript: string | null
  summary: string | null
  publishedDate: string | null
  engagementRatePercent: number | null
}

const DASHBOARD_QUERY = gql`
  query {
    youtubeCreatorsCollection(orderBy: [{ title: AscNullsLast }], first: 1000) {
      edges {
        node {
          id
          title
          channelId
          videoCount
          avgViewsPerVideo
          uploadFrequency
          competitiveThreat
          status
        }
      }
    }
    youtubeVideosCollection(first: 1000) {
      edges {
        node {
          id
          title
          channelId
          views
          likes
          comments
          duration
          durationType
          transcript
          summary
          publishedDate
          engagementRatePercent
        }
      }
    }
  }
`

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = Math.round(totalMinutes % 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

const COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#14b8a6", "#a855f7",
  "#6366f1", "#e11d48", "#059669", "#d97706", "#7c3aed",
  "#db2777", "#0891b2", "#ea580c", "#0d9488", "#9333ea",
]

const PIE_COLORS = {
  Short: "#ec4899",
  Full: "#0ea5e9",
}

export default function YouTubeDashboard() {
  const graphqlClient = useGraphQLClient()
  const [creators, setCreators] = useState<Creator[]>([])
  const [videos, setVideos] = useState<VideoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const data = await graphqlClient.request<{
          youtubeCreatorsCollection: { edges: { node: Creator }[] }
          youtubeVideosCollection: { edges: { node: VideoRow }[] }
        }>(DASHBOARD_QUERY)
        setCreators(extractNodes(data.youtubeCreatorsCollection))
        setVideos(extractNodes(data.youtubeVideosCollection))
      } catch (err) {
        console.error("Error loading YouTube dashboard:", err)
        setError(true)
      }
      setLoading(false)
    }
    load()
  }, [graphqlClient])

  // --- Computed stats ---
  const totalCreators = creators.length
  const totalVideos = videos.length
  const totalDuration = useMemo(() => videos.reduce((sum, v) => sum + (v.duration || 0), 0), [videos])
  const totalViews = useMemo(() => videos.reduce((sum, v) => sum + (v.views || 0), 0), [videos])
  const totalLikes = useMemo(() => videos.reduce((sum, v) => sum + (v.likes || 0), 0), [videos])
  const totalComments = useMemo(() => videos.reduce((sum, v) => sum + (v.comments || 0), 0), [videos])
  const withTranscript = useMemo(() => videos.filter((v) => v.transcript).length, [videos])
  const withSummary = useMemo(() => videos.filter((v) => v.summary).length, [videos])
  const shortVideos = useMemo(() => videos.filter((v) => v.durationType === "Short").length, [videos])
  const fullVideos = useMemo(() => videos.filter((v) => v.durationType === "Full").length, [videos])

  const transcriptPct = totalVideos > 0 ? Math.round((withTranscript / totalVideos) * 100) : 0
  const summaryPct = totalVideos > 0 ? Math.round((withSummary / totalVideos) * 100) : 0
  const shortPct = totalVideos > 0 ? Math.round((shortVideos / totalVideos) * 100) : 0

  // --- Creator lookup ---
  const creatorLookup = useMemo(() => {
    const map: Record<string, string> = {}
    creators.forEach((c) => { map[c.channelId] = c.title })
    return map
  }, [creators])

  // --- Videos per creator ---
  const videosPerCreator = useMemo(() => {
    const counts: Record<string, number> = {}
    videos.forEach((v) => { counts[v.channelId] = (counts[v.channelId] || 0) + 1 })
    return creators
      .map((c) => ({ name: c.title, videos: counts[c.channelId] || 0 }))
      .sort((a, b) => b.videos - a.videos)
      .slice(0, 20)
  }, [creators, videos])

  // --- Views per creator ---
  const viewsPerCreator = useMemo(() => {
    const sums: Record<string, number> = {}
    videos.forEach((v) => { sums[v.channelId] = (sums[v.channelId] || 0) + (v.views || 0) })
    return creators
      .map((c) => ({ name: c.title, views: sums[c.channelId] || 0 }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 20)
  }, [creators, videos])

  // --- Engagement per creator ---
  const engagementPerCreator = useMemo(() => {
    const data: Record<string, { likes: number; comments: number; views: number }> = {}
    videos.forEach((v) => {
      if (!data[v.channelId]) data[v.channelId] = { likes: 0, comments: 0, views: 0 }
      data[v.channelId].likes += v.likes || 0
      data[v.channelId].comments += v.comments || 0
      data[v.channelId].views += v.views || 0
    })
    return creators
      .map((c) => {
        const d = data[c.channelId] || { likes: 0, comments: 0, views: 0 }
        const engRate = d.views > 0 ? ((d.likes + d.comments) / d.views) * 100 : 0
        return { name: c.title, engagement: Math.round(engRate * 10) / 10 }
      })
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, 20)
  }, [creators, videos])

  // --- Shorts vs Full per creator (stacked bar) ---
  const shortFullPerCreator = useMemo(() => {
    const data: Record<string, { short: number; full: number }> = {}
    videos.forEach((v) => {
      if (!data[v.channelId]) data[v.channelId] = { short: 0, full: 0 }
      if (v.durationType === "Short") data[v.channelId].short++
      else data[v.channelId].full++
    })
    return creators
      .map((c) => {
        const d = data[c.channelId] || { short: 0, full: 0 }
        return { name: c.title, Short: d.short, Full: d.full, total: d.short + d.full }
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 20)
  }, [creators, videos])

  // --- Duration per creator ---
  const durationPerCreator = useMemo(() => {
    const sums: Record<string, number> = {}
    videos.forEach((v) => { sums[v.channelId] = (sums[v.channelId] || 0) + (v.duration || 0) })
    return creators
      .map((c) => ({ name: c.title, duration: Math.round(sums[c.channelId] || 0) }))
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 20)
  }, [creators, videos])

  // --- Transcript coverage per creator ---
  const transcriptPerCreator = useMemo(() => {
    const data: Record<string, { total: number; withTranscript: number }> = {}
    videos.forEach((v) => {
      if (!data[v.channelId]) data[v.channelId] = { total: 0, withTranscript: 0 }
      data[v.channelId].total++
      if (v.transcript) data[v.channelId].withTranscript++
    })
    return creators
      .map((c) => {
        const d = data[c.channelId] || { total: 0, withTranscript: 0 }
        const pct = d.total > 0 ? Math.round((d.withTranscript / d.total) * 100) : 0
        return { name: c.title, coverage: pct, withTranscript: d.withTranscript, total: d.total }
      })
      .sort((a, b) => b.coverage - a.coverage)
      .slice(0, 20)
  }, [creators, videos])

  // --- Pie data: Shorts vs Full ---
  const shortFullPie = useMemo(() => [
    { name: "Short", value: shortVideos },
    { name: "Full", value: fullVideos },
  ], [shortVideos, fullVideos])

  // --- Pie data: Transcript coverage ---
  const transcriptPie = useMemo(() => [
    { name: "With Transcript", value: withTranscript },
    { name: "No Transcript", value: totalVideos - withTranscript },
  ], [withTranscript, totalVideos])

  const summaryCards = [
    { label: "Creators", value: totalCreators, icon: Youtube, color: "text-red-500", bg: "bg-red-50 dark:bg-red-950", href: "/research/creators" },
    { label: "Videos", value: totalVideos, icon: Video, color: "text-sky-500", bg: "bg-sky-50 dark:bg-sky-950", href: "/research/videos" },
    { label: "Total Views", value: formatNumber(totalViews), icon: Eye, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950" },
    { label: "Total Likes", value: formatNumber(totalLikes), icon: ThumbsUp, color: "text-pink-500", bg: "bg-pink-50 dark:bg-pink-950" },
    { label: "Total Comments", value: formatNumber(totalComments), icon: MessageSquare, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950" },
    { label: "Total Duration", value: formatDuration(totalDuration), icon: Clock, color: "text-violet-500", bg: "bg-violet-50 dark:bg-violet-950" },
    { label: "Transcripts", value: `${transcriptPct}%`, sub: `${withTranscript} of ${totalVideos}`, icon: FileText, color: "text-teal-500", bg: "bg-teal-50 dark:bg-teal-950" },
    { label: "Shorts", value: `${shortPct}%`, sub: `${shortVideos} of ${totalVideos}`, icon: Video, color: "text-pink-500", bg: "bg-pink-50 dark:bg-pink-950" },
  ]

  return (
    <>
      <PageHeader section="YouTube" sectionHref="/research" page="Dashboard" />
      <div className="flex-1 p-6">
        <h1 className="text-2xl font-semibold mb-6">YouTube Dashboard</h1>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : error ? (
          <p className="text-muted-foreground">Failed to load dashboard data.</p>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4 mb-8">
              {summaryCards.map((card) => (
                <CardWrapper key={card.label} href={card.href}>
                  <div className={`rounded-lg border p-4 ${card.bg} hover:shadow-md transition-shadow h-full`}>
                    <div className="flex items-center gap-2 mb-2">
                      <card.icon className={`size-4 ${card.color}`} />
                      <span className="text-xs font-medium text-muted-foreground">{card.label}</span>
                    </div>
                    <div className="text-2xl font-bold">{card.value}</div>
                    {card.sub && <div className="text-xs text-muted-foreground mt-0.5">{card.sub}</div>}
                  </div>
                </CardWrapper>
              ))}
            </div>

            {/* Pie charts row */}
            <div className="grid gap-6 md:grid-cols-2 mb-8">
              <div className="rounded-lg border p-5">
                <h3 className="text-sm font-semibold mb-4">Shorts vs Full-Length Videos</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={shortFullPie}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {shortFullPie.map((entry) => (
                        <Cell key={entry.name} fill={PIE_COLORS[entry.name as keyof typeof PIE_COLORS] || "#999"} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--color-popover)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "0.375rem",
                        fontSize: "0.75rem",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="rounded-lg border p-5">
                <h3 className="text-sm font-semibold mb-4">Transcript Coverage</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={transcriptPie}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      <Cell fill="#14b8a6" />
                      <Cell fill="#d4d4d8" />
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--color-popover)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "0.375rem",
                        fontSize: "0.75rem",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bar charts */}
            <div className="grid gap-6 lg:grid-cols-2 mb-8">
              <HorizontalBarChart
                title="Videos per Creator"
                data={videosPerCreator}
                dataKey="videos"
                color="#3b82f6"
                formatter={(v: number) => `${v} videos`}
              />
              <HorizontalBarChart
                title="Total Views per Creator"
                data={viewsPerCreator}
                dataKey="views"
                color="#10b981"
                formatter={(v: number) => formatNumber(v)}
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-2 mb-8">
              <HorizontalBarChart
                title="Engagement Rate by Creator"
                data={engagementPerCreator}
                dataKey="engagement"
                color="#f59e0b"
                formatter={(v: number) => `${v}%`}
                unit="%"
              />
              <HorizontalBarChart
                title="Total Duration per Creator (min)"
                data={durationPerCreator}
                dataKey="duration"
                color="#8b5cf6"
                formatter={(v: number) => formatDuration(v)}
              />
            </div>

            {/* Stacked bar: Shorts vs Full by creator */}
            <div className="rounded-lg border p-5 mb-8">
              <h3 className="text-sm font-semibold mb-4">Shorts vs Full-Length by Creator</h3>
              <ResponsiveContainer width="100%" height={Math.max(shortFullPerCreator.length * 32 + 40, 200)}>
                <BarChart data={shortFullPerCreator} layout="vertical" margin={{ left: 120, right: 20, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={115} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "0.375rem",
                      fontSize: "0.75rem",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "0.75rem" }} />
                  <Bar dataKey="Short" stackId="a" fill="#ec4899" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Full" stackId="a" fill="#0ea5e9" radius={[0, 2, 2, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Transcript coverage by creator */}
            <div className="rounded-lg border p-5">
              <h3 className="text-sm font-semibold mb-4">Transcript Coverage by Creator</h3>
              <ResponsiveContainer width="100%" height={Math.max(transcriptPerCreator.length * 32 + 40, 200)}>
                <BarChart data={transcriptPerCreator} layout="vertical" margin={{ left: 120, right: 20, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={115} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "0.375rem",
                      fontSize: "0.75rem",
                    }}
                    formatter={(v: unknown) => [`${v}%`, "Coverage"]}
                  />
                  <Bar dataKey="coverage" fill="#14b8a6" radius={[0, 2, 2, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
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

function HorizontalBarChart({
  title,
  data,
  dataKey,
  color,
  formatter,
  unit,
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
            contentStyle={{
              backgroundColor: "var(--color-popover)",
              border: "1px solid var(--color-border)",
              borderRadius: "0.375rem",
              fontSize: "0.75rem",
            }}
            formatter={formatter ? (v: unknown) => [formatter(v as number), title.split(" ")[0]] : undefined}
          />
          <Bar dataKey={dataKey} fill={color} radius={[0, 2, 2, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
