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

interface AggregatedMetric {
  id: string
  metric_name: string
  aggregation_type: string
  period: string
  period_start: string
  period_end: string
  value: number
  sample_count: number | null
  dimension_1: string | null
}

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<AggregatedMetric[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data, error } = await supabaseInsights
        .from("aggregated_metrics")
        .select("id, metric_name, aggregation_type, period, period_start, period_end, value, sample_count, dimension_1")
        .order("period_start", { ascending: false })
        .limit(100)
      if (error) console.error("Error loading metrics:", error)
      else setMetrics(data || [])
      setLoading(false)
    }
    load()
  }, [])

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
                    <TableCell className="font-medium">{m.metric_name}</TableCell>
                    <TableCell><Badge variant="outline">{m.aggregation_type}</Badge></TableCell>
                    <TableCell>{m.period}</TableCell>
                    <TableCell>{new Date(m.period_start).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">{Number(m.value).toLocaleString()}</TableCell>
                    <TableCell className="text-right">{m.sample_count ?? "—"}</TableCell>
                    <TableCell>{m.dimension_1 || "—"}</TableCell>
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
