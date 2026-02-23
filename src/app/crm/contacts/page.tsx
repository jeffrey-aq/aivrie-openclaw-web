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

interface Contact {
  id: string
  fullName: string
  company: string | null
  role: string | null
  relationshipHealthScore: number
  interactionCount: number
  lastInteractionAt: string | null
  source: string | null
}

const CONTACTS_QUERY = gql`
  query {
    contactsCollection(
      filter: { isNoise: { eq: false } }
      orderBy: [{ lastInteractionAt: DescNullsLast }]
    ) {
      edges {
        node {
          id
          fullName
          company
          role
          relationshipHealthScore
          interactionCount
          lastInteractionAt
          source
        }
      }
    }
  }
`

function healthColor(score: number) {
  if (score >= 70) return "text-green-600"
  if (score >= 40) return "text-yellow-600"
  return "text-red-600"
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const data = await graphqlClient.request<{
          contactsCollection: { edges: { node: Contact }[] }
        }>(CONTACTS_QUERY)
        setContacts(extractNodes(data.contactsCollection))
      } catch (error) {
        console.error("Error loading contacts:", error)
      }
      setLoading(false)
    }
    load()
  }, [])

  return (
    <>
      <PageHeader section="CRM" sectionHref="/crm/contacts" page="Contacts" />
      <div className="flex-1 p-6">
        <h1 className="text-2xl font-semibold mb-4">Contacts</h1>
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : contacts.length === 0 ? (
          <p className="text-muted-foreground">No contacts found.</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Health</TableHead>
                  <TableHead className="text-right">Interactions</TableHead>
                  <TableHead>Last Interaction</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.fullName}</TableCell>
                    <TableCell>{c.company || "—"}</TableCell>
                    <TableCell>{c.role || "—"}</TableCell>
                    <TableCell className={`text-right font-semibold ${healthColor(c.relationshipHealthScore)}`}>
                      {c.relationshipHealthScore}
                    </TableCell>
                    <TableCell className="text-right">{c.interactionCount}</TableCell>
                    <TableCell>
                      {c.lastInteractionAt
                        ? new Date(c.lastInteractionAt).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell>{c.source || "—"}</TableCell>
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
