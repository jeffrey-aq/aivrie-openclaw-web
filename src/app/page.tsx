"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { gql } from "graphql-request"
import { useGraphQLClient } from "@/hooks/use-graphql"
import { PageHeader } from "@/components/page-header"
import {
  Users,
  MessageSquare,
  Clock,
  Youtube,
  Video,
  FileText,
  Network,
  Inbox,
  Lightbulb,
  Play,
  Database,
  BarChart3,
  ThumbsUp,
  Settings,
  UserCog,
  Send,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

type CollectionKey = string

interface SectionConfig {
  title: string
  color: string
  bgColor: string
  query: string
  keys: string[]
  items: {
    label: string
    key: CollectionKey
    icon: LucideIcon
    href: string
  }[]
}

const sections: SectionConfig[] = [
  {
    title: "CRM",
    color: "text-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-950",
    query: `{ contactsCollection { totalCount } interactionsCollection { totalCount } followUpsCollection { totalCount } }`,
    keys: ["contactsCollection", "interactionsCollection", "followUpsCollection"],
    items: [
      { label: "Contacts", key: "contactsCollection", icon: Users, href: "/crm/contacts" },
      { label: "Interactions", key: "interactionsCollection", icon: MessageSquare, href: "/crm/interactions" },
      { label: "Follow-ups", key: "followUpsCollection", icon: Clock, href: "/crm/follow-ups" },
    ],
  },
  {
    title: "YouTube",
    color: "text-red-500",
    bgColor: "bg-red-50 dark:bg-red-950",
    query: `{ youtubeCreatorsCollection { totalCount } youtubeVideosCollection { totalCount } }`,
    keys: ["youtubeCreatorsCollection", "youtubeVideosCollection"],
    items: [
      { label: "Creators", key: "youtubeCreatorsCollection", icon: Youtube, href: "/research/creators" },
      { label: "Videos", key: "youtubeVideosCollection", icon: Video, href: "/research/videos" },
    ],
  },
  {
    title: "Knowledge Base",
    color: "text-purple-500",
    bgColor: "bg-purple-50 dark:bg-purple-950",
    query: `{ sourcesCollection { totalCount } entitiesCollection { totalCount } ingestionQueueCollection { totalCount } }`,
    keys: ["sourcesCollection", "entitiesCollection", "ingestionQueueCollection"],
    items: [
      { label: "Sources", key: "sourcesCollection", icon: FileText, href: "/knowledgebase/sources" },
      { label: "Entities", key: "entitiesCollection", icon: Network, href: "/knowledgebase/entities" },
      { label: "Ingestion Queue", key: "ingestionQueueCollection", icon: Inbox, href: "/knowledgebase/ingestion" },
    ],
  },
  {
    title: "Insights",
    color: "text-amber-500",
    bgColor: "bg-amber-50 dark:bg-amber-950",
    query: `{ recommendationsCollection { totalCount } analysisRunsCollection { totalCount } dataSourcesCollection { totalCount } aggregatedMetricsCollection { totalCount } feedbackEventsCollection { totalCount } preferencePatternsCollection { totalCount } specialistPersonasCollection { totalCount } digestDeliveriesCollection { totalCount } }`,
    keys: ["recommendationsCollection", "analysisRunsCollection", "dataSourcesCollection", "aggregatedMetricsCollection", "feedbackEventsCollection", "preferencePatternsCollection", "specialistPersonasCollection", "digestDeliveriesCollection"],
    items: [
      { label: "Recommendations", key: "recommendationsCollection", icon: Lightbulb, href: "/insights/recommendations" },
      { label: "Analysis Runs", key: "analysisRunsCollection", icon: Play, href: "/insights/runs" },
      { label: "Data Sources", key: "dataSourcesCollection", icon: Database, href: "/insights/sources" },
      { label: "Metrics", key: "aggregatedMetricsCollection", icon: BarChart3, href: "/insights/metrics" },
      { label: "Feedback", key: "feedbackEventsCollection", icon: ThumbsUp, href: "/insights/feedback" },
      { label: "Preferences", key: "preferencePatternsCollection", icon: Settings, href: "/insights/preferences" },
      { label: "Specialist Personas", key: "specialistPersonasCollection", icon: UserCog, href: "/insights/personas" },
      { label: "Digest Deliveries", key: "digestDeliveriesCollection", icon: Send, href: "/insights/deliveries" },
    ],
  },
]

type Counts = Record<string, { totalCount: number }>

export default function Home() {
  const graphqlClient = useGraphQLClient()
  const [counts, setCounts] = useState<Counts>({})
  const [sectionStatus, setSectionStatus] = useState<Record<string, "loading" | "ok" | "error">>(() =>
    Object.fromEntries(sections.map((s) => [s.title, "loading" as const]))
  )

  useEffect(() => {
    sections.forEach((section) => {
      graphqlClient
        .request<Record<string, { totalCount: number }>>(gql`${section.query}`)
        .then((data) => {
          setCounts((prev) => ({ ...prev, ...data }))
          setSectionStatus((prev) => ({ ...prev, [section.title]: "ok" }))
        })
        .catch((err) => {
          console.error(`Error loading ${section.title} counts:`, err)
          setSectionStatus((prev) => ({ ...prev, [section.title]: "error" }))
        })
    })
  }, [graphqlClient])

  const allDone = Object.values(sectionStatus).every((s) => s !== "loading")

  return (
    <>
      <PageHeader section="Dashboard" sectionHref="/" page="Overview" />
      <div className="flex-1 p-6">
        <h1 className="text-2xl font-semibold mb-6">Dashboard</h1>
        <div className="grid gap-6 md:grid-cols-2">
          {sections.map((section) => {
            const status = sectionStatus[section.title]
            return (
              <div key={section.title} className={`rounded-lg border p-5 ${section.bgColor}`}>
                <h2 className={`text-lg font-semibold mb-4 ${section.color}`}>{section.title}</h2>
                {status === "loading" ? (
                  <p className="text-sm text-muted-foreground px-3 py-2">Loading...</p>
                ) : status === "error" ? (
                  <p className="text-sm text-muted-foreground px-3 py-2">Not available</p>
                ) : (
                  <div className="space-y-2">
                    {section.items.map((item) => (
                      <Link
                        key={item.key}
                        href={item.href}
                        className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-white/60 dark:hover:bg-white/10 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <item.icon className={`size-4 ${section.color}`} />
                          <span className="text-sm">{item.label}</span>
                        </div>
                        <span className="text-lg font-bold">
                          {(counts[item.key]?.totalCount ?? 0).toLocaleString()}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
