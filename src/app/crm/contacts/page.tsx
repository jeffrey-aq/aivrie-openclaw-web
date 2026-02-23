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
  full_name: string
  company: string | null
  role: string | null
  relationship_health_score: number
  interaction_count: number
  last_interaction_at: string | null
  source: string | null
}

const CONTACTS_QUERY = gql`
  query {
    crm_contactsCollection(
      filter: { is_noise: { eq: false } }
      orderBy: [{ last_interaction_at: DescNullsLast }]
    ) {
      edges {
        node {
          id
          full_name
          company
          role
          relationship_health_score
          interaction_count
          last_interaction_at
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
          crm_contactsCollection: { edges: { node: Contact }[] }
        }>(CONTACTS_QUERY)
        setContacts(extractNodes(data.crm_contactsCollection))
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
                    <TableCell className="font-medium">{c.full_name}</TableCell>
                    <TableCell>{c.company || "—"}</TableCell>
                    <TableCell>{c.role || "—"}</TableCell>
                    <TableCell className={`text-right font-semibold ${healthColor(c.relationship_health_score)}`}>
                      {c.relationship_health_score}
                    </TableCell>
                    <TableCell className="text-right">{c.interaction_count}</TableCell>
                    <TableCell>
                      {c.last_interaction_at
                        ? new Date(c.last_interaction_at).toLocaleDateString()
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
