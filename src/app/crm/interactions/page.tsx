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

interface Interaction {
  id: string
  type: string
  subject: string | null
  snippet: string | null
  occurredAt: string
  contact: { fullName: string } | null
}

const INTERACTIONS_QUERY = gql`
  query {
    interactionsCollection(
      orderBy: [{ occurredAt: DescNullsLast }]
      first: 100
    ) {
      edges {
        node {
          id
          type
          subject
          snippet
          occurredAt
          contact {
            fullName
          }
        }
      }
    }
  }
`

function typeLabel(type: string) {
  switch (type) {
    case "email_sent":
      return "Sent"
    case "email_received":
      return "Received"
    case "calendar_meeting":
      return "Meeting"
    default:
      return type
  }
}

export default function InteractionsPage() {
  const graphqlClient = useGraphQLClient()
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const data = await graphqlClient.request<{
          interactionsCollection: { edges: { node: Interaction }[] }
        }>(INTERACTIONS_QUERY)
        setInteractions(extractNodes(data.interactionsCollection))
      } catch (error) {
        console.error("Error loading interactions:", error)
      }
      setLoading(false)
    }
    load()
  }, [graphqlClient])

  return (
    <>
      <PageHeader section="CRM" sectionHref="/crm/contacts" page="Interactions" />
      <div className="flex-1 p-6">
        <h1 className="text-2xl font-semibold mb-4">Interactions</h1>
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : interactions.length === 0 ? (
          <p className="text-muted-foreground">No interactions found.</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contact</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead className="max-w-md">Snippet</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {interactions.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">
                      {i.contact?.fullName || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{typeLabel(i.type)}</Badge>
                    </TableCell>
                    <TableCell>{i.subject || "—"}</TableCell>
                    <TableCell className="max-w-md truncate text-muted-foreground">
                      {i.snippet || "—"}
                    </TableCell>
                    <TableCell>
                      {new Date(i.occurredAt).toLocaleDateString()}
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
