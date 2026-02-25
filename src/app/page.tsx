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
  Search,
  Youtube,
  Video,
  Brain,
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

interface EdgeList {
  edges: { node: { nodeId: string } }[]
}

interface CountsResponse {
  contactsCollection: EdgeList
  interactionsCollection: EdgeList
  followUpsCollection: EdgeList
  youtubeCreatorsCollection: EdgeList
  youtubeVideosCollection: EdgeList
  sourcesCollection: EdgeList
  entitiesCollection: EdgeList
  ingestionQueueCollection: EdgeList
  recommendationsCollection: EdgeList
  analysisRunsCollection: EdgeList
  dataSourcesCollection: EdgeList
  aggregatedMetricsCollection: EdgeList
  feedbackEventsCollection: EdgeList
  preferencePatternsCollection: EdgeList
  specialistPersonasCollection: EdgeList
  digestDeliveriesCollection: EdgeList
}

const COUNTS_QUERY = gql`
  query {
    contactsCollection(first: 1000) { edges { node { nodeId } } }
    interactionsCollection(first: 1000) { edges { node { nodeId } } }
    followUpsCollection(first: 1000) { edges { node { nodeId } } }
    youtubeCreatorsCollection(first: 1000) { edges { node { nodeId } } }
    youtubeVideosCollection(first: 1000) { edges { node { nodeId } } }
    sourcesCollection(first: 1000) { edges { node { nodeId } } }
    entitiesCollection(first: 1000) { edges { node { nodeId } } }
    ingestionQueueCollection(first: 1000) { edges { node { nodeId } } }
    recommendationsCollection(first: 1000) { edges { node { nodeId } } }
    analysisRunsCollection(first: 1000) { edges { node { nodeId } } }
    dataSourcesCollection(first: 1000) { edges { node { nodeId } } }
    aggregatedMetricsCollection(first: 1000) { edges { node { nodeId } } }
    feedbackEventsCollection(first: 1000) { edges { node { nodeId } } }
    preferencePatternsCollection(first: 1000) { edges { node { nodeId } } }
    specialistPersonasCollection(first: 1000) { edges { node { nodeId } } }
    digestDeliveriesCollection(first: 1000) { edges { node { nodeId } } }
  }
`

interface SectionConfig {
  title: string
  color: string
  bgColor: string
  items: {
    label: string
    key: keyof CountsResponse
    icon: LucideIcon
    href: string
  }[]
}

const sections: SectionConfig[] = [
  {
    title: "CRM",
    color: "text-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-950",
    items: [
      { label: "Contacts", key: "contactsCollection", icon: Users, href: "/crm/contacts" },
      { label: "Interactions", key: "interactionsCollection", icon: MessageSquare, href: "/crm/interactions" },
      { label: "Follow-ups", key: "followUpsCollection", icon: Clock, href: "/crm/follow-ups" },
    ],
  },
  {
    title: "Knowledge Base",
    color: "text-purple-500",
    bgColor: "bg-purple-50 dark:bg-purple-950",
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
  {
    title: "YouTube",
    color: "text-red-500",
    bgColor: "bg-red-50 dark:bg-red-950",
    items: [
      { label: "Creators", key: "youtubeCreatorsCollection", icon: Youtube, href: "/research/creators" },
      { label: "Videos", key: "youtubeVideosCollection", icon: Video, href: "/research/videos" },
    ],
  },
]

export default function Home() {
  const graphqlClient = useGraphQLClient()
  const [counts, setCounts] = useState<CountsResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const data = await graphqlClient.request<CountsResponse>(COUNTS_QUERY)
        setCounts(data)
      } catch (error) {
        console.error("Error loading counts:", error)
      }
      setLoading(false)
    }
    load()
  }, [graphqlClient])

  return (
    <>
      <PageHeader section="Dashboard" sectionHref="/" page="Overview" />
      <div className="flex-1 p-6">
        <h1 className="text-2xl font-semibold mb-6">Dashboard</h1>
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : !counts ? (
          <p className="text-muted-foreground">Failed to load counts.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {sections.map((section) => (
              <div key={section.title} className={`rounded-lg border p-5 ${section.bgColor}`}>
                <h2 className={`text-lg font-semibold mb-4 ${section.color}`}>{section.title}</h2>
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
                        {counts[item.key].edges.length.toLocaleString()}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
