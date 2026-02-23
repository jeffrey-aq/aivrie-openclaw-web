"use client"

import { useEffect, useState } from "react"
import { gql } from "graphql-request"
import { graphqlClient, extractNodes } from "@/lib/graphql"
import { PageHeader } from "@/components/page-header"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface DigestDelivery {
  id: string
  telegram_message_id: string
  telegram_chat_id: string
  telegram_topic_id: string | null
  recommendation_numbers: number[]
  delivered_at: string
  created_at: string
}

const DELIVERIES_QUERY = gql`
  query {
    insights_digest_deliveriesCollection(
      orderBy: [{ delivered_at: DescNullsLast }]
      first: 50
    ) {
      edges {
        node {
          id
          telegram_message_id
          telegram_chat_id
          telegram_topic_id
          recommendation_numbers
          delivered_at
          created_at
        }
      }
    }
  }
`

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<DigestDelivery[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const data = await graphqlClient.request<{
          insights_digest_deliveriesCollection: { edges: { node: DigestDelivery }[] }
        }>(DELIVERIES_QUERY)
        setDeliveries(extractNodes(data.insights_digest_deliveriesCollection))
      } catch (error) {
        console.error("Error loading deliveries:", error)
      }
      setLoading(false)
    }
    load()
  }, [])

  return (
    <>
      <PageHeader section="Insights" sectionHref="/insights/recommendations" page="Digest Deliveries" />
      <div className="flex-1 p-6">
        <h1 className="text-2xl font-semibold mb-4">Digest Deliveries</h1>
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : deliveries.length === 0 ? (
          <p className="text-muted-foreground">No digest deliveries found.</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Delivered</TableHead>
                  <TableHead>Chat ID</TableHead>
                  <TableHead>Topic</TableHead>
                  <TableHead>Message ID</TableHead>
                  <TableHead>Recommendations</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveries.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">
                      {new Date(d.delivered_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">{d.telegram_chat_id}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{d.telegram_topic_id || "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{d.telegram_message_id}</TableCell>
                    <TableCell>
                      {d.recommendation_numbers.length > 0
                        ? d.recommendation_numbers.join(", ")
                        : "—"}
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
