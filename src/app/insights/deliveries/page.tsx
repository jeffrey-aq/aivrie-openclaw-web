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
  telegramMessageId: string
  telegramChatId: string
  telegramTopicId: string | null
  recommendationNumbers: number[]
  deliveredAt: string
  createdAt: string
}

const DELIVERIES_QUERY = gql`
  query {
    digestDeliveriesCollection(
      orderBy: [{ deliveredAt: DescNullsLast }]
      first: 50
    ) {
      edges {
        node {
          id
          telegramMessageId
          telegramChatId
          telegramTopicId
          recommendationNumbers
          deliveredAt
          createdAt
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
          digestDeliveriesCollection: { edges: { node: DigestDelivery }[] }
        }>(DELIVERIES_QUERY)
        setDeliveries(extractNodes(data.digestDeliveriesCollection))
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
                      {new Date(d.deliveredAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">{d.telegramChatId}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{d.telegramTopicId || "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{d.telegramMessageId}</TableCell>
                    <TableCell>
                      {d.recommendationNumbers.length > 0
                        ? d.recommendationNumbers.join(", ")
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
