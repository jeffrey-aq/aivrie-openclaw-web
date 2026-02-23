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

interface Entity {
  id: string
  name: string
  entityType: string
  description: string | null
  mentionCount: number
  aliases: string[] | null
}

const ENTITIES_QUERY = gql`
  query {
    entitiesCollection(
      orderBy: [{ mentionCount: DescNullsLast }]
      first: 100
    ) {
      edges {
        node {
          id
          name
          entityType
          description
          mentionCount
          aliases
        }
      }
    }
  }
`

export default function EntitiesPage() {
  const [entities, setEntities] = useState<Entity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const data = await graphqlClient.request<{
          entitiesCollection: { edges: { node: Entity }[] }
        }>(ENTITIES_QUERY)
        setEntities(extractNodes(data.entitiesCollection))
      } catch (error) {
        console.error("Error loading entities:", error)
      }
      setLoading(false)
    }
    load()
  }, [])

  return (
    <>
      <PageHeader section="Knowledge Base" sectionHref="/knowledgebase/sources" page="Entities" />
      <div className="flex-1 p-6">
        <h1 className="text-2xl font-semibold mb-4">Entities</h1>
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : entities.length === 0 ? (
          <p className="text-muted-foreground">No entities found.</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Mentions</TableHead>
                  <TableHead>Aliases</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entities.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{e.entityType}</Badge>
                    </TableCell>
                    <TableCell className="max-w-sm truncate text-muted-foreground">
                      {e.description || "—"}
                    </TableCell>
                    <TableCell className="text-right">{e.mentionCount}</TableCell>
                    <TableCell>
                      {e.aliases?.length ? e.aliases.join(", ") : "—"}
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
