"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { gql } from "graphql-request"
import { extractNodes } from "@/lib/graphql"
import { useGraphQLClient } from "@/hooks/use-graphql"
import { PageHeader } from "@/components/page-header"
import { Users, MessageSquare, Clock } from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

interface TimestampedRow {
  createdAt: string
  updatedAt: string
}

interface CrmDashboardData {
  contactsCollection: { edges: { node: TimestampedRow }[] }
  interactionsCollection: { edges: { node: TimestampedRow }[] }
  followUpsCollection: { edges: { node: TimestampedRow }[] }
}

const DASHBOARD_QUERY = gql`
  query {
    contactsCollection(first: 1000) {
      edges { node { createdAt updatedAt } }
    }
    interactionsCollection(first: 1000) {
      edges { node { createdAt updatedAt } }
    }
    followUpsCollection(first: 1000) {
      edges { node { createdAt updatedAt } }
    }
  }
`

function getWeekLabel(date: Date): string {
  const start = new Date(date)
  start.setDate(start.getDate() - start.getDay())
  return start.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function getWeekKey(date: Date): string {
  const start = new Date(date)
  start.setDate(start.getDate() - start.getDay())
  return start.toISOString().slice(0, 10)
}

function aggregateByWeek(rows: TimestampedRow[], weeks: string[]) {
  const created: Record<string, number> = {}
  const modified: Record<string, number> = {}
  weeks.forEach((w) => { created[w] = 0; modified[w] = 0 })

  rows.forEach((r) => {
    const ck = getWeekKey(new Date(r.createdAt))
    if (created[ck] !== undefined) created[ck]++

    if (r.updatedAt && r.updatedAt !== r.createdAt) {
      const uk = getWeekKey(new Date(r.updatedAt))
      if (modified[uk] !== undefined) modified[uk]++
    }
  })

  return weeks.map((w) => ({
    week: getWeekLabel(new Date(w)),
    Created: created[w],
    Modified: modified[w],
  }))
}

function getLast8Weeks(): string[] {
  const weeks: string[] = []
  const now = new Date()
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i * 7)
    weeks.push(getWeekKey(d))
  }
  return weeks
}

export default function CrmDashboard() {
  const graphqlClient = useGraphQLClient()
  const [data, setData] = useState<CrmDashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const result = await graphqlClient.request<CrmDashboardData>(DASHBOARD_QUERY)
        setData(result)
      } catch (error) {
        console.error("Error loading CRM dashboard:", error)
      }
      setLoading(false)
    }
    load()
  }, [graphqlClient])

  const weeks = useMemo(() => getLast8Weeks(), [])

  const contacts = useMemo(() => data ? extractNodes(data.contactsCollection) : [], [data])
  const interactions = useMemo(() => data ? extractNodes(data.interactionsCollection) : [], [data])
  const followUps = useMemo(() => data ? extractNodes(data.followUpsCollection) : [], [data])

  const contactsChart = useMemo(() => aggregateByWeek(contacts, weeks), [contacts, weeks])
  const interactionsChart = useMemo(() => aggregateByWeek(interactions, weeks), [interactions, weeks])
  const followUpsChart = useMemo(() => aggregateByWeek(followUps, weeks), [followUps, weeks])

  const summaryCards = [
    { label: "Contacts", count: contacts.length, icon: Users, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950", href: "/crm/contacts" },
    { label: "Interactions", count: interactions.length, icon: MessageSquare, color: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-950", href: "/crm/interactions" },
    { label: "Follow-ups", count: followUps.length, icon: Clock, color: "text-violet-500", bg: "bg-violet-50 dark:bg-violet-950", href: "/crm/follow-ups" },
  ]

  return (
    <>
      <PageHeader section="CRM" sectionHref="/crm" page="Dashboard" />
      <div className="flex-1 p-6">
        <h1 className="text-2xl font-semibold mb-6">CRM Dashboard</h1>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : !data ? (
          <p className="text-muted-foreground">Failed to load dashboard data.</p>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid gap-4 md:grid-cols-3 mb-8">
              {summaryCards.map((card) => (
                <Link
                  key={card.label}
                  href={card.href}
                  className={`rounded-lg border p-5 ${card.bg} hover:shadow-md transition-shadow`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <card.icon className={`size-5 ${card.color}`} />
                      <span className="font-medium">{card.label}</span>
                    </div>
                    <span className="text-2xl font-bold">{card.count.toLocaleString()}</span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Activity charts */}
            <div className="grid gap-6 lg:grid-cols-1">
              <ActivityChart title="Contacts Activity" data={contactsChart} color="#3b82f6" />
              <ActivityChart title="Interactions Activity" data={interactionsChart} color="#6366f1" />
              <ActivityChart title="Follow-ups Activity" data={followUpsChart} color="#8b5cf6" />
            </div>
          </>
        )}
      </div>
    </>
  )
}

function ActivityChart({
  title,
  data,
  color,
}: {
  title: string
  data: { week: string; Created: number; Modified: number }[]
  color: string
}) {
  return (
    <div className="rounded-lg border p-5">
      <h3 className="text-sm font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis dataKey="week" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--color-popover)",
              border: "1px solid var(--color-border)",
              borderRadius: "0.375rem",
              fontSize: "0.75rem",
            }}
          />
          <Legend wrapperStyle={{ fontSize: "0.75rem" }} />
          <Bar dataKey="Created" fill={color} radius={[2, 2, 0, 0]} />
          <Bar dataKey="Modified" fill={`${color}80`} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
