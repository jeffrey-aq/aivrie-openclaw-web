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

interface Creator {
  id: string
  title: string
  channelId: string
  subscribers: number | null
  totalViews: number | null
  videoCount: number | null
  niche: string | null
  status: string | null
  competitiveThreat: string | null
  uploadFrequency: string | null
  lastUploadDate: string | null
}

const CREATORS_QUERY = gql`
  query {
    youtubeCreatorsCollection(orderBy: [{ subscribers: DescNullsLast }]) {
      edges {
        node {
          id
          title
          channelId
          subscribers
          totalViews
          videoCount
          niche
          status
          competitiveThreat
          uploadFrequency
          lastUploadDate
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
  const graphqlClient = useGraphQLClient()
  const [creators, setCreators] = useState<Creator[]>([])
  const [loading, setLoading] = useState(true)

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
                    <TableCell className="text-right">{formatNumber(c.totalViews)}</TableCell>
                    <TableCell className="text-right">{c.videoCount ?? "—"}</TableCell>
                    <TableCell>{c.uploadFrequency || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={statusColor(c.status)}>{c.status || "—"}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={threatColor(c.competitiveThreat)}>
                        {c.competitiveThreat || "—"}
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
