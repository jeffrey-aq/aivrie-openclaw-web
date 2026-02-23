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

interface FollowUp {
  id: string
  note: string | null
  dueDate: string
  status: string
  snoozedUntil: string | null
  contact: { fullName: string } | null
}

const FOLLOW_UPS_QUERY = gql`
  query {
    followUpsCollection(orderBy: [{ dueDate: AscNullsLast }]) {
      edges {
        node {
          id
          note
          dueDate
          status
          snoozedUntil
          contact {
            fullName
          }
        }
      }
    }
  }
`

function statusVariant(status: string) {
  switch (status) {
    case "pending":
      return "default"
    case "snoozed":
      return "secondary"
    case "done":
      return "outline"
    default:
      return "outline"
  }
}

export default function FollowUpsPage() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const data = await graphqlClient.request<{
          followUpsCollection: { edges: { node: FollowUp }[] }
        }>(FOLLOW_UPS_QUERY)
        setFollowUps(extractNodes(data.followUpsCollection))
      } catch (error) {
        console.error("Error loading follow-ups:", error)
      }
      setLoading(false)
    }
    load()
  }, [])

  return (
    <>
      <PageHeader section="CRM" sectionHref="/crm/contacts" page="Follow-ups" />
      <div className="flex-1 p-6">
        <h1 className="text-2xl font-semibold mb-4">Follow-ups</h1>
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : followUps.length === 0 ? (
          <p className="text-muted-foreground">No follow-ups found.</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contact</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Snoozed Until</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {followUps.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">
                      {f.contact?.fullName || "—"}
                    </TableCell>
                    <TableCell className="max-w-md truncate">{f.note || "—"}</TableCell>
                    <TableCell>{f.dueDate}</TableCell>
                    <TableCell>{f.snoozedUntil || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(f.status)}>{f.status}</Badge>
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
