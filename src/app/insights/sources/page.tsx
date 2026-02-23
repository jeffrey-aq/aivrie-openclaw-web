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

interface DataSource {
  id: string
  name: string
  displayName: string
  category: string
  isActive: boolean
  syncFrequencyHours: number
  lastSyncAt: string | null
}

const DATA_SOURCES_QUERY = gql`
  query {
    dataSourcesCollection(orderBy: [{ category: AscNullsLast }]) {
      edges {
        node {
          id
          name
          displayName
          category
          isActive
          syncFrequencyHours
          lastSyncAt
        }
      }
    }
  }
`

export default function DataSourcesPage() {
  const graphqlClient = useGraphQLClient()
  const [sources, setSources] = useState<DataSource[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const data = await graphqlClient.request<{
          dataSourcesCollection: { edges: { node: DataSource }[] }
        }>(DATA_SOURCES_QUERY)
        setSources(extractNodes(data.dataSourcesCollection))
      } catch (error) {
        console.error("Error loading data sources:", error)
      }
      setLoading(false)
    }
    load()
  }, [graphqlClient])

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
                    <TableCell className="font-medium">{s.displayName}</TableCell>
                    <TableCell><Badge variant="outline">{s.category}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={s.isActive ? "default" : "secondary"}>
                        {s.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{s.syncFrequencyHours}h</TableCell>
                    <TableCell>
                      {s.lastSyncAt ? new Date(s.lastSyncAt).toLocaleString() : "Never"}
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
