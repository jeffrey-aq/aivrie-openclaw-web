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

interface SpecialistPersona {
  id: string
  name: string
  display_name: string
  focus: string
  system_prompt: string
  data_sources: string[]
  is_active: boolean
  model: string
  created_at: string
  updated_at: string
}

const PERSONAS_QUERY = gql`
  query {
    insights_specialist_personasCollection(
      orderBy: [{ name: AscNullsLast }]
      first: 50
    ) {
      edges {
        node {
          id
          name
          display_name
          focus
          system_prompt
          data_sources
          is_active
          model
          created_at
          updated_at
        }
      }
    }
  }
`

export default function PersonasPage() {
  const [personas, setPersonas] = useState<SpecialistPersona[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const data = await graphqlClient.request<{
          insights_specialist_personasCollection: { edges: { node: SpecialistPersona }[] }
        }>(PERSONAS_QUERY)
        setPersonas(extractNodes(data.insights_specialist_personasCollection))
      } catch (error) {
        console.error("Error loading personas:", error)
      }
      setLoading(false)
    }
    load()
  }, [])

  return (
    <>
      <PageHeader section="Insights" sectionHref="/insights/recommendations" page="Specialist Personas" />
      <div className="flex-1 p-6">
        <h1 className="text-2xl font-semibold mb-4">Specialist Personas</h1>
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : personas.length === 0 ? (
          <p className="text-muted-foreground">No specialist personas found.</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Display Name</TableHead>
                  <TableHead>Focus</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Data Sources</TableHead>
                  <TableHead>Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {personas.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.display_name}</TableCell>
                    <TableCell className="max-w-xs truncate">{p.focus}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{p.model}</TableCell>
                    <TableCell>{p.data_sources.length}</TableCell>
                    <TableCell>
                      <Badge variant={p.is_active ? "default" : "outline"}>
                        {p.is_active ? "active" : "inactive"}
                      </Badge>
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
