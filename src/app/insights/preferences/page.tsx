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

interface PreferencePattern {
  id: string
  pattern_type: string
  pattern_key: string
  pattern_value: Record<string, unknown>
  confidence: number | null
  sample_count: number
  updated_at: string
}

const PREFERENCES_QUERY = gql`
  query {
    insights_preference_patternsCollection(
      orderBy: [{ updated_at: DescNullsLast }]
    ) {
      edges {
        node {
          id
          pattern_type
          pattern_key
          pattern_value
          confidence
          sample_count
          updated_at
        }
      }
    }
  }
`

export default function PreferencesPage() {
  const [patterns, setPatterns] = useState<PreferencePattern[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const data = await graphqlClient.request<{
          insights_preference_patternsCollection: { edges: { node: PreferencePattern }[] }
        }>(PREFERENCES_QUERY)
        setPatterns(extractNodes(data.insights_preference_patternsCollection))
      } catch (error) {
        console.error("Error loading preferences:", error)
      }
      setLoading(false)
    }
    load()
  }, [])

  return (
    <>
      <PageHeader section="Insights" sectionHref="/insights/recommendations" page="Preferences" />
      <div className="flex-1 p-6">
        <h1 className="text-2xl font-semibold mb-4">Preference Patterns</h1>
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : patterns.length === 0 ? (
          <p className="text-muted-foreground">No preference patterns found.</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead className="text-right">Confidence</TableHead>
                  <TableHead className="text-right">Samples</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patterns.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.pattern_type}</TableCell>
                    <TableCell>{p.pattern_key}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground font-mono text-xs">
                      {JSON.stringify(p.pattern_value)}
                    </TableCell>
                    <TableCell className="text-right">
                      {p.confidence != null ? `${(p.confidence * 100).toFixed(0)}%` : "—"}
                    </TableCell>
                    <TableCell className="text-right">{p.sample_count}</TableCell>
                    <TableCell>{new Date(p.updated_at).toLocaleDateString()}</TableCell>
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
