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

interface Recommendation {
  id: string
  number: number
  title: string
  description: string
  impact: string
  effort: string
  urgency: string
  category: string | null
  confidenceScore: number | null
  status: string
  isContradiction: boolean
  createdAt: string
}

const RECOMMENDATIONS_QUERY = gql`
  query {
    recommendationsCollection(
      orderBy: [{ createdAt: DescNullsLast }]
      first: 100
    ) {
      edges {
        node {
          id
          number
          title
          description
          impact
          effort
          urgency
          category
          confidenceScore
          status
          isContradiction
          createdAt
        }
      }
    }
  }
`

function impactVariant(level: string) {
  switch (level) {
    case "high": return "destructive"
    case "medium": return "default"
    case "low": return "secondary"
    default: return "outline"
  }
}

function urgencyVariant(level: string) {
  switch (level) {
    case "now": return "destructive"
    case "soon": return "default"
    case "later": return "secondary"
    default: return "outline"
  }
}

function statusVariant(status: string) {
  switch (status) {
    case "implemented": return "default"
    case "approved": return "default"
    case "pending": return "secondary"
    case "rejected": return "outline"
    default: return "outline"
  }
}

export default function RecommendationsPage() {
  const [items, setItems] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const data = await graphqlClient.request<{
          recommendationsCollection: { edges: { node: Recommendation }[] }
        }>(RECOMMENDATIONS_QUERY)
        setItems(extractNodes(data.recommendationsCollection))
      } catch (error) {
        console.error("Error loading recommendations:", error)
      }
      setLoading(false)
    }
    load()
  }, [])

  return (
    <>
      <PageHeader section="Insights" sectionHref="/insights/recommendations" page="Recommendations" />
      <div className="flex-1 p-6">
        <h1 className="text-2xl font-semibold mb-4">Recommendations</h1>
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground">No recommendations found.</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Impact</TableHead>
                  <TableHead>Effort</TableHead>
                  <TableHead>Urgency</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.number}</TableCell>
                    <TableCell className="font-medium max-w-xs truncate">{r.title}</TableCell>
                    <TableCell>{r.category || "—"}</TableCell>
                    <TableCell><Badge variant={impactVariant(r.impact)}>{r.impact}</Badge></TableCell>
                    <TableCell>{r.effort}</TableCell>
                    <TableCell><Badge variant={urgencyVariant(r.urgency)}>{r.urgency}</Badge></TableCell>
                    <TableCell>{r.confidenceScore != null ? `${(r.confidenceScore * 100).toFixed(0)}%` : "—"}</TableCell>
                    <TableCell><Badge variant={statusVariant(r.status)}>{r.status}</Badge></TableCell>
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
