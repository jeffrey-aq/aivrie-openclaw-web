"use client"

import { useEffect, useState } from "react"
import { supabaseResearch } from "@/lib/supabase"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface Video {
  id: string
  title: string
  video_id: string
  channel_id: string
  type: string | null
  views: number | null
  likes: number | null
  comments: number | null
  published_date: string | null
  status: string | null
  workstream: string | null
}

function formatNumber(n: number | null) {
  if (n == null) return "—"
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data, error } = await supabaseResearch
        .from("youtube_videos")
        .select("id, title, video_id, channel_id, type, views, likes, comments, published_date, status, workstream")
        .order("published_date", { ascending: false, nullsFirst: false })
      if (error) console.error("Error loading videos:", error)
      else setVideos(data || [])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <>
      <PageHeader section="Research" sectionHref="/research/creators" page="YouTube Videos" />
      <div className="flex-1 p-6">
        <h1 className="text-2xl font-semibold mb-4">YouTube Videos</h1>
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : videos.length === 0 ? (
          <p className="text-muted-foreground">No videos found.</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Views</TableHead>
                  <TableHead className="text-right">Likes</TableHead>
                  <TableHead className="text-right">Comments</TableHead>
                  <TableHead>Published</TableHead>
                  <TableHead>Workstream</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {videos.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium max-w-xs truncate">{v.title}</TableCell>
                    <TableCell>{v.type || "—"}</TableCell>
                    <TableCell className="text-right">{formatNumber(v.views)}</TableCell>
                    <TableCell className="text-right">{formatNumber(v.likes)}</TableCell>
                    <TableCell className="text-right">{formatNumber(v.comments)}</TableCell>
                    <TableCell>{v.published_date || "—"}</TableCell>
                    <TableCell>
                      {v.workstream ? <Badge variant="outline">{v.workstream}</Badge> : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={v.status === "Published" ? "default" : "secondary"}>
                        {v.status || "—"}
                      </Badge>
                    </TableCell>
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
