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

interface DataSource {
  id: string
  name: string
  display_name: string
  category: string
  is_active: boolean
  sync_frequency_hours: number
  last_sync_at: string | null
}

const DATA_SOURCES_QUERY = gql`
  query {
    insights_data_sourcesCollection(orderBy: [{ category: AscNullsLast }]) {
      edges {
        node {
          id
          name
          display_name
          category
          is_active
          sync_frequency_hours
          last_sync_at
        }
      }
    }
  }
`

export default function DataSourcesPage() {
  const [sources, setSources] = useState<DataSource[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const data = await graphqlClient.request<{
          insights_data_sourcesCollection: { edges: { node: DataSource }[] }
        }>(DATA_SOURCES_QUERY)
        setSources(extractNodes(data.insights_data_sourcesCollection))
      } catch (error) {
        console.error("Error loading data sources:", error)
      }
      setLoading(false)
    }
    load()
  }, [])

  return (
    <>
      <PageHeader section="Insights" sectionHref="/insights/recommendations" page="Data Sources" />
      <div className="flex-1 p-6">
        <h1 className="text-2xl font-semibold mb-4">Data Sources</h1>
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : sources.length === 0 ? (
          <p className="text-muted-foreground">No data sources found.</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Sync Frequency</TableHead>
                  <TableHead>Last Sync</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sources.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.display_name}</TableCell>
                    <TableCell><Badge variant="outline">{s.category}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={s.is_active ? "default" : "secondary"}>
                        {s.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{s.sync_frequency_hours}h</TableCell>
                    <TableCell>
                      {s.last_sync_at ? new Date(s.last_sync_at).toLocaleString() : "Never"}
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
