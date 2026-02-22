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

interface FollowUp {
  id: string
  note: string | null
  due_date: string
  status: string
  snoozed_until: string | null
  contacts: { full_name: string } | null
}

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
      const { data, error } = await supabaseCrm
        .from("follow_ups")
        .select("id, note, due_date, status, snoozed_until, contacts(full_name)")
        .order("due_date", { ascending: true })
      if (error) console.error("Error loading follow-ups:", error)
      else setFollowUps((data as unknown as FollowUp[]) || [])
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
                      {f.contacts?.full_name || "—"}
                    </TableCell>
                    <TableCell className="max-w-md truncate">{f.note || "—"}</TableCell>
                    <TableCell>{f.due_date}</TableCell>
                    <TableCell>{f.snoozed_until || "—"}</TableCell>
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
