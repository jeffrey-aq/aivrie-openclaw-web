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

interface AggregatedMetric {
  id: string
  metricName: string
  aggregationType: string
  period: string
  periodStart: string
  periodEnd: string
  value: number
  sampleCount: number | null
  dimension1: string | null
}

const METRICS_QUERY = gql`
  query {
    aggregatedMetricsCollection(
      orderBy: [{ periodStart: DescNullsLast }]
      first: 100
    ) {
      edges {
        node {
          id
          metricName
          aggregationType
          period
          periodStart
          periodEnd
          value
          sampleCount
          dimension1
        }
      }
    }
  }
`

export default function MetricsPage() {
  const graphqlClient = useGraphQLClient()
  const [metrics, setMetrics] = useState<AggregatedMetric[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const data = await graphqlClient.request<{
          aggregatedMetricsCollection: { edges: { node: AggregatedMetric }[] }
        }>(METRICS_QUERY)
        setMetrics(extractNodes(data.aggregatedMetricsCollection))
      } catch (error) {
        console.error("Error loading metrics:", error)
      }
      setLoading(false)
    }
    load()
  }, [graphqlClient])

  return (
    <>
      <PageHeader section="Insights" sectionHref="/insights/recommendations" page="Metrics" />
      <div className="flex-1 p-6">
        <h1 className="text-2xl font-semibold mb-4">Aggregated Metrics</h1>
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : metrics.length === 0 ? (
          <p className="text-muted-foreground">No metrics found.</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metric</TableHead>
                  <TableHead>Aggregation</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-right">Samples</TableHead>
                  <TableHead>Dimension</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.metricName}</TableCell>
                    <TableCell><Badge variant="outline">{m.aggregationType}</Badge></TableCell>
                    <TableCell>{m.period}</TableCell>
                    <TableCell>{new Date(m.periodStart).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">{Number(m.value).toLocaleString()}</TableCell>
                    <TableCell className="text-right">{m.sampleCount ?? "—"}</TableCell>
                    <TableCell>{m.dimension1 || "—"}</TableCell>
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
