"use client"

import { useEffect, useState } from "react"
import { supabaseInsights } from "@/lib/supabase"
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
  recommendation_type: string | null
  impact_level: string | null
  was_successful: boolean | null
  outcome_notes: string | null
  created_at: string
}

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
  const [events, setEvents] = useState<FeedbackEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data, error } = await supabaseInsights
        .from("feedback_events")
        .select("id, action, reason, recommendation_type, impact_level, was_successful, outcome_notes, created_at")
        .order("created_at", { ascending: false })
        .limit(100)
      if (error) console.error("Error loading feedback:", error)
      else setEvents(data || [])
      setLoading(false)
    }
    load()
  }, [])

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
                    <TableCell>{e.recommendation_type || "—"}</TableCell>
                    <TableCell>{e.impact_level || "—"}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">{e.reason || "—"}</TableCell>
                    <TableCell>
                      {e.was_successful == null ? "—" : e.was_successful ? "Yes" : "No"}
                    </TableCell>
                    <TableCell>{new Date(e.created_at).toLocaleDateString()}</TableCell>
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
