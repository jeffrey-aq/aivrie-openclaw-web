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
  runDate: string
  status: string
  specialistsSpawned: number
  specialistsCompleted: number
  recommendationsGenerated: number
  durationSeconds: number | null
  errorMessage: string | null
  startedAt: string
}

const RUNS_QUERY = gql`
  query {
    analysisRunsCollection(
      orderBy: [{ runDate: DescNullsLast }]
      first: 50
    ) {
      edges {
        node {
          id
          runDate
          status
          specialistsSpawned
          specialistsCompleted
          recommendationsGenerated
          durationSeconds
          errorMessage
          startedAt
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
          analysisRunsCollection: { edges: { node: AnalysisRun }[] }
        }>(RUNS_QUERY)
        setRuns(extractNodes(data.analysisRunsCollection))
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
                    <TableCell className="font-medium">{r.runDate}</TableCell>
                    <TableCell><Badge variant={statusVariant(r.status)}>{r.status}</Badge></TableCell>
                    <TableCell className="text-right">{r.specialistsCompleted}/{r.specialistsSpawned}</TableCell>
                    <TableCell className="text-right">{r.recommendationsGenerated}</TableCell>
                    <TableCell className="text-right">
                      {r.durationSeconds != null ? `${r.durationSeconds}s` : "—"}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {r.errorMessage || "—"}
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
