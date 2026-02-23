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

interface QueueItem {
  id: string
  url: string
  status: string
  requires_browser: boolean
  retry_count: number
  last_error: string | null
  created_at: string
}

const INGESTION_QUERY = gql`
  query {
    knowledgebase_ingestion_queueCollection(
      orderBy: [{ created_at: DescNullsLast }]
      first: 100
    ) {
      edges {
        node {
          id
          url
          status
          requires_browser
          retry_count
          last_error
          created_at
        }
      }
    }
  }
`

function statusVariant(status: string) {
  switch (status) {
    case "completed":
      return "default"
    case "processing":
      return "secondary"
    case "queued":
      return "outline"
    case "failed":
      return "destructive"
    default:
      return "outline"
  }
}

export default function IngestionPage() {
  const [items, setItems] = useState<QueueItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const data = await graphqlClient.request<{
          knowledgebase_ingestion_queueCollection: { edges: { node: QueueItem }[] }
        }>(INGESTION_QUERY)
        setItems(extractNodes(data.knowledgebase_ingestion_queueCollection))
      } catch (error) {
        console.error("Error loading ingestion queue:", error)
      }
      setLoading(false)
    }
    load()
  }, [])

  return (
    <>
      <PageHeader section="Knowledgebase" sectionHref="/knowledgebase/sources" page="Ingestion Queue" />
      <div className="flex-1 p-6">
        <h1 className="text-2xl font-semibold mb-4">Ingestion Queue</h1>
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground">No items in queue.</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>URL</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Browser</TableHead>
                  <TableHead className="text-right">Retries</TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium max-w-xs truncate">
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {item.url}
                      </a>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
                    </TableCell>
                    <TableCell>{item.requires_browser ? "Yes" : "No"}</TableCell>
                    <TableCell className="text-right">{item.retry_count}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {item.last_error || "—"}
                    </TableCell>
                    <TableCell>
                      {new Date(item.created_at).toLocaleDateString()}
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
