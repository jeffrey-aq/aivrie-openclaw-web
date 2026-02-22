"use client"

import { useEffect, useState } from "react"
import { supabaseKb } from "@/lib/supabase"
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
  entity_type: string
  description: string | null
  mention_count: number
  aliases: string[] | null
}

export default function EntitiesPage() {
  const [entities, setEntities] = useState<Entity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data, error } = await supabaseKb
        .from("entities")
        .select("id, name, entity_type, description, mention_count, aliases")
        .order("mention_count", { ascending: false })
        .limit(100)
      if (error) console.error("Error loading entities:", error)
      else setEntities(data || [])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <>
      <PageHeader section="Knowledgebase" sectionHref="/knowledgebase/sources" page="Entities" />
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
                      <Badge variant="outline">{e.entity_type}</Badge>
                    </TableCell>
                    <TableCell className="max-w-sm truncate text-muted-foreground">
                      {e.description || "—"}
                    </TableCell>
                    <TableCell className="text-right">{e.mention_count}</TableCell>
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
