"use client"

import { useEffect, useState } from "react"
import { gql } from "graphql-request"
import { graphqlClient, extractNodes } from "@/lib/graphql"
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

interface Creator {
  id: string
  title: string
  channel_id: string
  subscribers: number | null
  total_views: number | null
  video_count: number | null
  niche: string | null
  status: string | null
  competitive_threat: string | null
  upload_frequency: string | null
  last_upload_date: string | null
}

const CREATORS_QUERY = gql`
  query {
    research_youtube_creatorsCollection(orderBy: [{ subscribers: DescNullsLast }]) {
      edges {
        node {
          id
          title
          channel_id
          subscribers
          total_views
          video_count
          niche
          status
          competitive_threat
          upload_frequency
          last_upload_date
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

function threatColor(level: string | null) {
  switch (level) {
    case "High":
      return "destructive"
    case "Medium":
      return "default"
    case "Low":
      return "secondary"
    default:
      return "outline"
  }
}

function statusColor(status: string | null) {
  switch (status) {
    case "Active":
      return "default"
    case "Rising":
      return "default"
    case "Monitoring":
      return "secondary"
    case "Inactive":
      return "outline"
    default:
      return "outline"
  }
}

export default function CreatorsPage() {
  const [creators, setCreators] = useState<Creator[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const data = await graphqlClient.request<{
          research_youtube_creatorsCollection: { edges: { node: Creator }[] }
        }>(CREATORS_QUERY)
        setCreators(extractNodes(data.research_youtube_creatorsCollection))
      } catch (error) {
        console.error("Error loading creators:", error)
      }
      setLoading(false)
    }
    load()
  }, [])

  return (
    <>
      <PageHeader section="Research" sectionHref="/research/creators" page="YouTube Creators" />
      <div className="flex-1 p-6">
        <h1 className="text-2xl font-semibold mb-4">YouTube Creators</h1>
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : creators.length === 0 ? (
          <p className="text-muted-foreground">No creators found.</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Creator</TableHead>
                  <TableHead>Niche</TableHead>
                  <TableHead className="text-right">Subscribers</TableHead>
                  <TableHead className="text-right">Total Views</TableHead>
                  <TableHead className="text-right">Videos</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Threat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {creators.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.title}</TableCell>
                    <TableCell>{c.niche || "—"}</TableCell>
                    <TableCell className="text-right">{formatNumber(c.subscribers)}</TableCell>
                    <TableCell className="text-right">{formatNumber(c.total_views)}</TableCell>
                    <TableCell className="text-right">{c.video_count ?? "—"}</TableCell>
                    <TableCell>{c.upload_frequency || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={statusColor(c.status)}>{c.status || "—"}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={threatColor(c.competitive_threat)}>
                        {c.competitive_threat || "—"}
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
