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
  displayName: string
  focus: string
  systemPrompt: string
  dataSources: string[]
  isActive: boolean
  model: string
  createdAt: string
  updatedAt: string
}

const PERSONAS_QUERY = gql`
  query {
    specialistPersonasCollection(
      orderBy: [{ name: AscNullsLast }]
      first: 50
    ) {
      edges {
        node {
          id
          name
          displayName
          focus
          systemPrompt
          dataSources
          isActive
          model
          createdAt
          updatedAt
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
          specialistPersonasCollection: { edges: { node: SpecialistPersona }[] }
        }>(PERSONAS_QUERY)
        setPersonas(extractNodes(data.specialistPersonasCollection))
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
                    <TableCell>{p.displayName}</TableCell>
                    <TableCell className="max-w-xs truncate">{p.focus}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{p.model}</TableCell>
                    <TableCell>{p.dataSources.length}</TableCell>
                    <TableCell>
                      <Badge variant={p.isActive ? "default" : "outline"}>
                        {p.isActive ? "active" : "inactive"}
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
