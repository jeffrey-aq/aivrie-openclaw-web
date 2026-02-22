"use client"

import { useEffect, useState } from "react"
import { supabaseCrm } from "@/lib/supabase"
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
  occurred_at: string
  contacts: { full_name: string } | null
}

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
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data, error } = await supabaseCrm
        .from("interactions")
        .select("id, type, subject, snippet, occurred_at, contacts(full_name)")
        .order("occurred_at", { ascending: false })
        .limit(100)
      if (error) console.error("Error loading interactions:", error)
      else setInteractions((data as unknown as Interaction[]) || [])
      setLoading(false)
    }
    load()
  }, [])

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
                      {i.contacts?.full_name || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{typeLabel(i.type)}</Badge>
                    </TableCell>
                    <TableCell>{i.subject || "—"}</TableCell>
                    <TableCell className="max-w-md truncate text-muted-foreground">
                      {i.snippet || "—"}
                    </TableCell>
                    <TableCell>
                      {new Date(i.occurred_at).toLocaleDateString()}
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
