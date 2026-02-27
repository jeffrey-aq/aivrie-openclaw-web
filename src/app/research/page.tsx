"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { gql } from "graphql-request"
import { extractNodes } from "@/lib/graphql"
import { useGraphQLClient } from "@/hooks/use-graphql"
import { supabase } from "@/lib/supabase-client"
import { PageHeader } from "@/components/page-header"
import { Youtube, Video, Clock, FileText, Eye, ThumbsUp, MessageSquare, Star } from "lucide-react"
import { SuccessDriversTab } from "@/components/research/success-drivers-tab"
import { StrategyTab } from "@/components/research/strategy-tab"
import { CreatorProfilesTab } from "@/components/research/creator-profiles-tab"
import { ContentMixTab } from "@/components/research/content-mix-tab"
import { RevenueTab } from "@/components/research/revenue-tab"

// ─── Exported types for tab components ──────────────────────────────────────

export interface CreatorFull {
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

export interface VideoRow {
  id: string
  channelId: string
  views: number | string | null
  likes: number | string | null
  comments: number | string | null
  duration: number | string | null
  durationType: string | null
  transcript: string | null
  summary: string | null
  engagementRatePercent: number | null
  publishedDate: string | null
}

export interface VideoStats {
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

export interface HistogramRow {
  bucket_label: string
  video_count: number
}

export type DashboardStats = {
  total_views: number
  total_likes: number
  total_comments: number
  total_duration: number
  short_count: number
  full_count: number
  with_transcript: number
  total_videos: number
}

export interface DashboardData {
  creators: CreatorFull[]
  videos: VideoRow[]
  videoStats: Map<string, VideoStats>
  dbStats: DashboardStats | null
  histograms: {
    shortDuration: HistogramRow[]
    fullDuration: HistogramRow[]
    shortViews: HistogramRow[]
    fullViews: HistogramRow[]
  }
}

// ─── GraphQL query: full creator fields + extended video fields ─────────────

const DATA_QUERY = gql`
  query {
    youtubeCreatorsCollection(orderBy: [{ title: AscNullsLast }], first: 1000) {
      totalCount
      edges {
        node {
          id title channelId channelUrl
          subscribers totalViews videoCount viewsToSubRatio avgViewsPerVideo
          uploadFrequency contentTypes topContentType typicalVideoLength
          estRevenueRange otherVentures monetization
          strengths opportunities keyInsights competitiveThreat
          lastAnalyzedDate status workstream notes
          avatarUrl bannerUrl description keywords country
          topicCategories trailerVideoId isStarred
        }
      }
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
          engagementRatePercent publishedDate
        }
      }
    }
    starredVideosCollection: youtubeVideosCollection(filter: { isStarred: { eq: true } }) {
      totalCount
    }
  }
`

// ─── RPC types ──────────────────────────────────────────────────────────────

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

interface SummaryCard {
  label: string
  value: string
  sub?: string
  breakdown?: string
  icon: typeof Youtube
  color: string
  bg: string
  href?: string
}

// ─── Tabs ───────────────────────────────────────────────────────────────────

const TABS = [
  { key: "success-drivers", label: "Success Drivers" },
  { key: "strategy", label: "Strategy" },
  { key: "creator-profiles", label: "Creator Profiles" },
  { key: "content-mix", label: "Content Mix" },
  { key: "revenue", label: "Revenue" },
] as const

type TabKey = (typeof TABS)[number]["key"]

// ─── Component ──────────────────────────────────────────────────────────────

export default function YouTubeDashboard() {
  const graphqlClient = useGraphQLClient()
  const [activeTab, setActiveTab] = useState<TabKey>("success-drivers")

  const [creators, setCreators] = useState<CreatorFull[]>([])
  const [videos, setVideos] = useState<VideoRow[]>([])
  const [totalCreators, setTotalCreators] = useState(0)
  const [totalVideos, setTotalVideos] = useState(0)
  const [starredCreators, setStarredCreators] = useState(0)
  const [starredVideos, setStarredVideos] = useState(0)
  const [videoStats, setVideoStats] = useState<Map<string, VideoStats>>(new Map())
  const [dbStats, setDbStats] = useState<DashboardStats | null>(null)
  const [shortDurationHist, setShortDurationHist] = useState<HistogramRow[]>([])
  const [fullDurationHist, setFullDurationHist] = useState<HistogramRow[]>([])
  const [shortViewsHist, setShortViewsHist] = useState<HistogramRow[]>([])
  const [fullViewsHist, setFullViewsHist] = useState<HistogramRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    // Fetch creators + videos via GraphQL
    graphqlClient
      .request<{
        youtubeCreatorsCollection: { totalCount: number; edges: { node: CreatorFull }[] }
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

    // Fetch per-creator video stats via RPC
    supabase
      .schema("research")
      .rpc("get_creator_video_stats")
      .then(({ data, error }) => {
        if (error) { console.error("Error loading video stats:", error); return }
        const rows = data as RpcVideoStats[]
        const stats = new Map<string, VideoStats>()
        for (const r of rows) {
          stats.set(r.channel_id, {
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
          })
        }
        setVideoStats(stats)
      })

    // Dashboard aggregate stats
    supabase
      .schema("research")
      .rpc("get_youtube_dashboard_stats")
      .then(({ data, error }) => {
        if (error) { console.error("Error loading dashboard stats:", error); return }
        if (data && data.length > 0) setDbStats(data[0])
      })

    // Histograms
    supabase.schema("research").rpc("get_short_duration_histogram")
      .then(({ data, error }) => {
        if (error) { console.error("Error loading short duration histogram:", error); return }
        if (data) setShortDurationHist((data as HistogramRow[]).map((r) => ({ bucket_label: r.bucket_label, video_count: Number(r.video_count) })))
      })

    supabase.schema("research").rpc("get_full_duration_histogram")
      .then(({ data, error }) => {
        if (error) { console.error("Error loading full duration histogram:", error); return }
        if (data) setFullDurationHist((data as HistogramRow[]).map((r) => ({ bucket_label: r.bucket_label, video_count: Number(r.video_count) })))
      })

    supabase.schema("research").rpc("get_video_views_histogram_by_type", { p_type: "Short" })
      .then(({ data, error }) => {
        if (error) { console.error("Error loading short views histogram:", error); return }
        if (data) setShortViewsHist((data as HistogramRow[]).map((r) => ({ bucket_label: r.bucket_label, video_count: Number(r.video_count) })))
      })

    supabase.schema("research").rpc("get_video_views_histogram_by_type", { p_type: "Full" })
      .then(({ data, error }) => {
        if (error) { console.error("Error loading full views histogram:", error); return }
        if (data) setFullViewsHist((data as HistogramRow[]).map((r) => ({ bucket_label: r.bucket_label, video_count: Number(r.video_count) })))
      })
  }, [graphqlClient])

  // ─── Summary cards (shown on Success Drivers tab) ─────────────────────────
  const totalViews = dbStats?.total_views ?? videos.reduce((s, v) => s + toNum(v.views), 0)
  const totalLikes = dbStats?.total_likes ?? videos.reduce((s, v) => s + toNum(v.likes), 0)
  const totalComments = dbStats?.total_comments ?? videos.reduce((s, v) => s + toNum(v.comments), 0)
  const totalDuration = dbStats?.total_duration ?? videos.reduce((s, v) => s + toNum(v.duration), 0)
  const shortVideos = dbStats?.short_count ?? videos.filter((v) => v.durationType === "Short").length
  const fullVideos = (dbStats?.total_videos ?? totalVideos) - shortVideos
  const withTranscript = dbStats?.with_transcript ?? videos.filter((v) => v.transcript).length
  const videoCount = dbStats?.total_videos ?? totalVideos
  const transcriptPct = videoCount > 0 ? Math.round((withTranscript / videoCount) * 100) : 0
  const shortPct = videoCount > 0 ? Math.round((shortVideos / videoCount) * 100) : 0
  const fullPct = 100 - shortPct

  // Full/Short breakdowns from video data
  const shortVids = videos.filter((v) => v.durationType === "Short")
  const fullVids = videos.filter((v) => v.durationType !== "Short")
  const viewsShort = shortVids.reduce((s, v) => s + toNum(v.views), 0)
  const viewsFull = fullVids.reduce((s, v) => s + toNum(v.views), 0)
  const durationShort = shortVids.reduce((s, v) => s + toNum(v.duration), 0)
  const durationFull = fullVids.reduce((s, v) => s + toNum(v.duration), 0)
  const likesShort = shortVids.reduce((s, v) => s + toNum(v.likes), 0)
  const likesFull = fullVids.reduce((s, v) => s + toNum(v.likes), 0)
  const commentsShort = shortVids.reduce((s, v) => s + toNum(v.comments), 0)
  const commentsFull = fullVids.reduce((s, v) => s + toNum(v.comments), 0)

  const fmt = (n: number) => Math.round(n).toLocaleString()

  const summaryCards: SummaryCard[] = [
    { label: "Creators", value: totalCreators.toLocaleString(), sub: `${starredCreators} starred`, icon: Youtube, color: "text-red-500", bg: "bg-red-50 dark:bg-red-950", href: "/research/creators" },
    { label: "Videos", value: totalVideos.toLocaleString(), sub: `${starredVideos} starred`, icon: Video, color: "text-sky-500", bg: "bg-sky-50 dark:bg-sky-950", href: "/research/videos",
      breakdown: `Full: ${fmt(fullVideos)} (${fullPct}%) · Short: ${fmt(shortVideos)} (${shortPct}%)` },
    { label: "Total Views", value: fmt(totalViews), icon: Eye, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950",
      breakdown: `Full: ${fmt(viewsFull)} · Short: ${fmt(viewsShort)}` },
    { label: "Total Duration", value: fmt(totalDuration) + " min", icon: Clock, color: "text-violet-500", bg: "bg-violet-50 dark:bg-violet-950",
      breakdown: `Full: ${fmt(durationFull)} min · Short: ${fmt(durationShort)} min` },
    { label: "Total Likes", value: fmt(totalLikes), icon: ThumbsUp, color: "text-pink-500", bg: "bg-pink-50 dark:bg-pink-950",
      breakdown: `Full: ${fmt(likesFull)} · Short: ${fmt(likesShort)}` },
    { label: "Total Comments", value: fmt(totalComments), icon: MessageSquare, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950",
      breakdown: `Full: ${fmt(commentsFull)} · Short: ${fmt(commentsShort)}` },
    { label: "Transcripts", value: `${transcriptPct}%`, sub: `${withTranscript} of ${videoCount}`, icon: FileText, color: "text-teal-500", bg: "bg-teal-50 dark:bg-teal-950" },
    { label: "Shorts", value: `${shortPct}%`, sub: `${fmt(shortVideos)} of ${fmt(videoCount)}`, icon: Video, color: "text-pink-500", bg: "bg-pink-50 dark:bg-pink-950" },
  ]

  // ─── DashboardData prop for tabs ──────────────────────────────────────────
  const dashboardData: DashboardData = useMemo(() => ({
    creators,
    videos,
    videoStats,
    dbStats,
    histograms: {
      shortDuration: shortDurationHist,
      fullDuration: fullDurationHist,
      shortViews: shortViewsHist,
      fullViews: fullViewsHist,
    },
  }), [creators, videos, videoStats, dbStats, shortDurationHist, fullDurationHist, shortViewsHist, fullViewsHist])

  // ─── Render ───────────────────────────────────────────────────────────────
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
            {activeTab === "success-drivers" && (
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
                        {card.sub && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            {card.sub.includes("starred") && <Star className="size-3 fill-yellow-400 text-yellow-400" />}
                            {card.sub}
                          </div>
                        )}
                        {card.breakdown && (
                          <div className="text-[10px] text-muted-foreground mt-1">{card.breakdown}</div>
                        )}
                      </div>
                    </CardWrapper>
                  ))}
                </div>
                <SuccessDriversTab data={dashboardData} />
              </>
            )}

            {activeTab === "strategy" && <StrategyTab data={dashboardData} />}
            {activeTab === "creator-profiles" && <CreatorProfilesTab data={dashboardData} />}
            {activeTab === "content-mix" && <ContentMixTab data={dashboardData} />}
            {activeTab === "revenue" && <RevenueTab data={dashboardData} />}
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
