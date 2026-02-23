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

interface FeedbackEvent {
  id: string
  action: string
  reason: string | null
  recommendationType: string | null
  impactLevel: string | null
  wasSuccessful: boolean | null
  outcomeNotes: string | null
  createdAt: string
}

const FEEDBACK_QUERY = gql`
  query {
    feedbackEventsCollection(
      orderBy: [{ createdAt: DescNullsLast }]
      first: 100
    ) {
      edges {
        node {
          id
          action
          reason
          recommendationType
          impactLevel
          wasSuccessful
          outcomeNotes
          createdAt
        }
      }
    }
  }
`

function actionVariant(action: string) {
  switch (action) {
    case "approved": return "default"
    case "implemented": return "default"
    case "rejected": return "destructive"
    case "deep_dive": return "secondary"
    case "cancelled": return "outline"
    default: return "outline"
  }
}

export default function FeedbackPage() {
  const graphqlClient = useGraphQLClient()
  const [events, setEvents] = useState<FeedbackEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const data = await graphqlClient.request<{
          feedbackEventsCollection: { edges: { node: FeedbackEvent }[] }
        }>(FEEDBACK_QUERY)
        setEvents(extractNodes(data.feedbackEventsCollection))
      } catch (error) {
        console.error("Error loading feedback:", error)
      }
      setLoading(false)
    }
    load()
  }, [graphqlClient])

  return (
    <>
      <PageHeader section="Insights" sectionHref="/insights/recommendations" page="Feedback" />
      <div className="flex-1 p-6">
        <h1 className="text-2xl font-semibold mb-4">Feedback Events</h1>
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : events.length === 0 ? (
          <p className="text-muted-foreground">No feedback events found.</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Impact</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Successful</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell><Badge variant={actionVariant(e.action)}>{e.action}</Badge></TableCell>
                    <TableCell>{e.recommendationType || "—"}</TableCell>
                    <TableCell>{e.impactLevel || "—"}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">{e.reason || "—"}</TableCell>
                    <TableCell>
                      {e.wasSuccessful == null ? "—" : e.wasSuccessful ? "Yes" : "No"}
                    </TableCell>
                    <TableCell>{new Date(e.createdAt).toLocaleDateString()}</TableCell>
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
