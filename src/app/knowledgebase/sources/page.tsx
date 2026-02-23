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

interface Source {
  id: string
  title: string | null
  source_type: string
  url: string
  author: string | null
  site_name: string | null
  published_at: string | null
  word_count: number | null
}

const SOURCES_QUERY = gql`
  query {
    knowledgebase_sourcesCollection(
      orderBy: [{ created_at: DescNullsLast }]
      first: 100
    ) {
      edges {
        node {
          id
          title
          source_type
          url
          author
          site_name
          published_at
          word_count
        }
      }
    }
  }
`

export default function SourcesPage() {
  const [sources, setSources] = useState<Source[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const data = await graphqlClient.request<{
          knowledgebase_sourcesCollection: { edges: { node: Source }[] }
        }>(SOURCES_QUERY)
        setSources(extractNodes(data.knowledgebase_sourcesCollection))
      } catch (error) {
        console.error("Error loading sources:", error)
      }
      setLoading(false)
    }
    load()
  }, [])

  return (
    <>
      <PageHeader section="Knowledgebase" sectionHref="/knowledgebase/sources" page="Sources" />
      <div className="flex-1 p-6">
        <h1 className="text-2xl font-semibold mb-4">Sources</h1>
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : sources.length === 0 ? (
          <p className="text-muted-foreground">No sources found.</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead className="text-right">Words</TableHead>
                  <TableHead>Published</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sources.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium max-w-xs truncate">
                      {s.url ? (
                        <a href={s.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                          {s.title || "Untitled"}
                        </a>
                      ) : (
                        s.title || "Untitled"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{s.source_type}</Badge>
                    </TableCell>
                    <TableCell>{s.author || "—"}</TableCell>
                    <TableCell>{s.site_name || "—"}</TableCell>
                    <TableCell className="text-right">
                      {s.word_count?.toLocaleString() || "—"}
                    </TableCell>
                    <TableCell>
                      {s.published_at
                        ? new Date(s.published_at).toLocaleDateString()
                        : "—"}
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
