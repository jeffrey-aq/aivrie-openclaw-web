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

interface AnalysisRun {
  id: string
  run_date: string
  status: string
  specialists_spawned: number
  specialists_completed: number
  recommendations_generated: number
  duration_seconds: number | null
  error_message: string | null
  started_at: string
}

const RUNS_QUERY = gql`
  query {
    insights_analysis_runsCollection(
      orderBy: [{ run_date: DescNullsLast }]
      first: 50
    ) {
      edges {
        node {
          id
          run_date
          status
          specialists_spawned
          specialists_completed
          recommendations_generated
          duration_seconds
          error_message
          started_at
        }
      }
    }
  }
`

function statusVariant(status: string) {
  switch (status) {
    case "completed": return "default"
    case "running": return "secondary"
    case "failed": return "destructive"
    case "cancelled": return "outline"
    default: return "outline"
  }
}

export default function RunsPage() {
  const [runs, setRuns] = useState<AnalysisRun[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const data = await graphqlClient.request<{
          insights_analysis_runsCollection: { edges: { node: AnalysisRun }[] }
        }>(RUNS_QUERY)
        setRuns(extractNodes(data.insights_analysis_runsCollection))
      } catch (error) {
        console.error("Error loading runs:", error)
      }
      setLoading(false)
    }
    load()
  }, [])

  return (
    <>
      <PageHeader section="Insights" sectionHref="/insights/recommendations" page="Analysis Runs" />
      <div className="flex-1 p-6">
        <h1 className="text-2xl font-semibold mb-4">Analysis Runs</h1>
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : runs.length === 0 ? (
          <p className="text-muted-foreground">No analysis runs found.</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Specialists</TableHead>
                  <TableHead className="text-right">Recommendations</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.run_date}</TableCell>
                    <TableCell><Badge variant={statusVariant(r.status)}>{r.status}</Badge></TableCell>
                    <TableCell className="text-right">{r.specialists_completed}/{r.specialists_spawned}</TableCell>
                    <TableCell className="text-right">{r.recommendations_generated}</TableCell>
                    <TableCell className="text-right">
                      {r.duration_seconds != null ? `${r.duration_seconds}s` : "—"}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {r.error_message || "—"}
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
