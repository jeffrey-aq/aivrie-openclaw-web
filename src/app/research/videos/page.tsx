"use client"

import { useEffect, useState } from "react"
import { gql } from "graphql-request"
import { extractNodes } from "@/lib/graphql"
import { useGraphQLClient } from "@/hooks/use-graphql"
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
  videoId: string
  channelId: string
  type: string | null
  views: number | null
  likes: number | null
  comments: number | null
  publishedDate: string | null
  status: string | null
  workstream: string | null
}

const VIDEOS_QUERY = gql`
  query {
    youtubeVideosCollection(
      orderBy: [{ publishedDate: DescNullsLast }]
    ) {
      edges {
        node {
          id
          title
          videoId
          channelId
          type
          views
          likes
          comments
          publishedDate
          status
          workstream
        }
      }
    }
  }
`

function formatNumber(n: number | null) {
  if (n == null) return "—"
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

export default function VideosPage() {
  const graphqlClient = useGraphQLClient()
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const data = await graphqlClient.request<{
          youtubeVideosCollection: { edges: { node: Video }[] }
        }>(VIDEOS_QUERY)
        setVideos(extractNodes(data.youtubeVideosCollection))
      } catch (error) {
        console.error("Error loading videos:", error)
      }
      setLoading(false)
    }
    load()
  }, [graphqlClient])

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
                    <TableCell>{v.publishedDate || "—"}</TableCell>
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
