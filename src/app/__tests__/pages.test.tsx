import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { print } from "graphql"

// Mock graphql module — vi.hoisted ensures mockRequest is available when vi.mock runs
const { mockRequest } = vi.hoisted(() => ({
  mockRequest: vi.fn(),
}))
vi.mock("@/lib/graphql", () => ({
  graphqlClient: { request: mockRequest },
  extractNodes: <T,>(connection: { edges: { node: T }[] }): T[] =>
    connection.edges.map((e) => e.node),
}))

// Mock page-header to avoid sidebar context dependency
vi.mock("@/components/page-header", () => ({
  PageHeader: () => null,
}))

// Page imports (mock is hoisted, so these get the mocked graphqlClient)
import ContactsPage from "@/app/crm/contacts/page"
import FollowUpsPage from "@/app/crm/follow-ups/page"
import InteractionsPage from "@/app/crm/interactions/page"
import CreatorsPage from "@/app/research/creators/page"
import VideosPage from "@/app/research/videos/page"
import KbSourcesPage from "@/app/knowledgebase/sources/page"
import EntitiesPage from "@/app/knowledgebase/entities/page"
import IngestionPage from "@/app/knowledgebase/ingestion/page"
import RecommendationsPage from "@/app/insights/recommendations/page"
import RunsPage from "@/app/insights/runs/page"
import DataSourcesPage from "@/app/insights/sources/page"
import MetricsPage from "@/app/insights/metrics/page"
import FeedbackPage from "@/app/insights/feedback/page"
import PreferencesPage from "@/app/insights/preferences/page"
import PersonasPage from "@/app/insights/personas/page"
import DeliveriesPage from "@/app/insights/deliveries/page"

const pageTests = [
  {
    name: "Contacts",
    Component: ContactsPage,
    collection: "crm_contactsCollection",
    node: {
      id: "c1",
      full_name: "Alice Smith",
      company: "Acme",
      role: "CEO",
      relationship_health_score: 80,
      interaction_count: 5,
      last_interaction_at: "2024-01-01T00:00:00Z",
      source: "email",
    },
    assertText: "Alice Smith",
  },
  {
    name: "Follow-ups",
    Component: FollowUpsPage,
    collection: "crm_follow_upsCollection",
    node: {
      id: "f1",
      note: "Check in next week",
      due_date: "2024-02-01",
      status: "pending",
      snoozed_until: null,
      crm_contacts: { full_name: "Jane Doe" },
    },
    assertText: "Jane Doe",
  },
  {
    name: "Interactions",
    Component: InteractionsPage,
    collection: "crm_interactionsCollection",
    node: {
      id: "i1",
      type: "email_sent",
      subject: "Hello",
      snippet: "Hi there",
      occurred_at: "2024-01-15T10:00:00Z",
      crm_contacts: { full_name: "John Doe" },
    },
    assertText: "John Doe",
  },
  {
    name: "YouTube Creators",
    Component: CreatorsPage,
    collection: "research_youtube_creatorsCollection",
    node: {
      id: "cr1",
      title: "TechChannel",
      channel_id: "UC123",
      subscribers: 150000,
      total_views: 5000000,
      video_count: 200,
      niche: "Technology",
      status: "Active",
      competitive_threat: "Medium",
      upload_frequency: "Weekly",
      last_upload_date: "2024-01-20",
    },
    assertText: "TechChannel",
  },
  {
    name: "YouTube Videos",
    Component: VideosPage,
    collection: "research_youtube_videosCollection",
    node: {
      id: "v1",
      title: "How to Code",
      video_id: "abc123",
      channel_id: "UC123",
      type: "tutorial",
      views: 10000,
      likes: 500,
      comments: 50,
      published_date: "2024-01-10",
      status: "Published",
      workstream: "Education",
    },
    assertText: "How to Code",
  },
  {
    name: "KB Sources",
    Component: KbSourcesPage,
    collection: "knowledgebase_sourcesCollection",
    node: {
      id: "ks1",
      title: "Research Paper",
      source_type: "article",
      url: "https://example.com/paper",
      author: "Dr. Smith",
      site_name: "ArXiv",
      published_at: "2024-01-05T00:00:00Z",
      word_count: 5000,
    },
    assertText: "Research Paper",
  },
  {
    name: "Entities",
    Component: EntitiesPage,
    collection: "knowledgebase_entitiesCollection",
    node: {
      id: "e1",
      name: "Bitcoin",
      entity_type: "cryptocurrency",
      description: "Digital currency",
      mention_count: 42,
      aliases: ["BTC"],
    },
    assertText: "Bitcoin",
  },
  {
    name: "Ingestion Queue",
    Component: IngestionPage,
    collection: "knowledgebase_ingestion_queueCollection",
    node: {
      id: "iq1",
      url: "https://example.com/article",
      status: "completed",
      requires_browser: false,
      retry_count: 0,
      last_error: null,
      created_at: "2024-01-01T00:00:00Z",
    },
    assertText: "https://example.com/article",
  },
  {
    name: "Recommendations",
    Component: RecommendationsPage,
    collection: "insights_recommendationsCollection",
    node: {
      id: "r1",
      number: 1,
      title: "Optimize Pipeline",
      description: "Improve data pipeline efficiency",
      impact: "high",
      effort: "medium",
      urgency: "soon",
      category: "Engineering",
      confidence_score: 0.85,
      status: "pending",
      is_contradiction: false,
      created_at: "2024-01-01T00:00:00Z",
    },
    assertText: "Optimize Pipeline",
  },
  {
    name: "Analysis Runs",
    Component: RunsPage,
    collection: "insights_analysis_runsCollection",
    node: {
      id: "ar1",
      run_date: "2024-06-01",
      status: "completed",
      specialists_spawned: 5,
      specialists_completed: 5,
      recommendations_generated: 12,
      duration_seconds: 120,
      error_message: null,
      started_at: "2024-06-01T08:00:00Z",
    },
    assertText: "2024-06-01",
  },
  {
    name: "Data Sources",
    Component: DataSourcesPage,
    collection: "insights_data_sourcesCollection",
    node: {
      id: "ds1",
      name: "email_inbox",
      display_name: "Email Inbox",
      category: "communication",
      is_active: true,
      sync_frequency_hours: 6,
      last_sync_at: "2024-01-20T12:00:00Z",
    },
    assertText: "Email Inbox",
  },
  {
    name: "Metrics",
    Component: MetricsPage,
    collection: "insights_aggregated_metricsCollection",
    node: {
      id: "m1",
      metric_name: "response_time",
      aggregation_type: "avg",
      period: "daily",
      period_start: "2024-01-01",
      period_end: "2024-01-02",
      value: 250,
      sample_count: 100,
      dimension_1: "api",
    },
    assertText: "response_time",
  },
  {
    name: "Feedback",
    Component: FeedbackPage,
    collection: "insights_feedback_eventsCollection",
    node: {
      id: "fe1",
      action: "approved",
      reason: "Good suggestion",
      recommendation_type: "optimization",
      impact_level: "high",
      was_successful: true,
      outcome_notes: null,
      created_at: "2024-01-15T00:00:00Z",
    },
    assertText: "approved",
  },
  {
    name: "Preferences",
    Component: PreferencesPage,
    collection: "insights_preference_patternsCollection",
    node: {
      id: "pp1",
      pattern_type: "scheduling",
      pattern_key: "timezone",
      pattern_value: { value: "UTC" },
      confidence: 0.9,
      sample_count: 50,
      updated_at: "2024-01-20T00:00:00Z",
    },
    assertText: "timezone",
  },
  {
    name: "Specialist Personas",
    Component: PersonasPage,
    collection: "insights_specialist_personasCollection",
    node: {
      id: "sp1",
      name: "market_analyst",
      display_name: "Market Analyst",
      focus: "Financial market trends",
      system_prompt: "You are a market analyst.",
      data_sources: ["email_inbox", "news_feed"],
      is_active: true,
      model: "claude-sonnet-4-6",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
    assertText: "market_analyst",
  },
  {
    name: "Digest Deliveries",
    Component: DeliveriesPage,
    collection: "insights_digest_deliveriesCollection",
    node: {
      id: "dd1",
      telegram_message_id: "12345",
      telegram_chat_id: "-100999",
      telegram_topic_id: "42",
      recommendation_numbers: [1, 3, 5],
      delivered_at: "2024-01-20T08:00:00Z",
      created_at: "2024-01-20T08:00:00Z",
    },
    assertText: "1, 3, 5",
  },
]

describe("Page rendering", () => {
  beforeEach(() => {
    mockRequest.mockReset()
  })

  it.each(pageTests)(
    "$name page renders table with data",
    async ({ Component, collection, node, assertText }) => {
      mockRequest.mockResolvedValueOnce({
        [collection]: { edges: [{ node }] },
      })

      render(<Component />)

      expect(await screen.findByText(assertText)).toBeInTheDocument()
    }
  )

  it("personas query targets specialist_personasCollection", async () => {
    mockRequest.mockResolvedValueOnce({
      insights_specialist_personasCollection: { edges: [{ node: {
        id: "sp1", name: "test_persona", display_name: "Test", focus: "Testing",
        system_prompt: "prompt", data_sources: [], is_active: true,
        model: "claude-sonnet-4-6", created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      }}] },
    })

    render(<PersonasPage />)
    await screen.findByText("test_persona")

    const query = mockRequest.mock.calls[0][0]
    const queryStr = typeof query === "string" ? query : print(query)
    expect(queryStr).toContain("insights_specialist_personasCollection")
  })

  it("deliveries query targets digest_deliveriesCollection", async () => {
    mockRequest.mockResolvedValueOnce({
      insights_digest_deliveriesCollection: { edges: [{ node: {
        id: "dd1", telegram_message_id: "999", telegram_chat_id: "-100",
        telegram_topic_id: null, recommendation_numbers: [2, 4],
        delivered_at: "2024-01-20T08:00:00Z", created_at: "2024-01-20T08:00:00Z",
      }}] },
    })

    render(<DeliveriesPage />)
    await screen.findByText("2, 4")

    const query = mockRequest.mock.calls[0][0]
    const queryStr = typeof query === "string" ? query : print(query)
    expect(queryStr).toContain("insights_digest_deliveriesCollection")
  })

  it("contacts query includes is_noise filter", async () => {
    mockRequest.mockResolvedValueOnce({
      crm_contactsCollection: {
        edges: [
          {
            node: {
              id: "c1",
              full_name: "Test",
              company: null,
              role: null,
              relationship_health_score: 50,
              interaction_count: 0,
              last_interaction_at: null,
              source: null,
            },
          },
        ],
      },
    })

    render(<ContactsPage />)
    await screen.findByText("Test")

    const query = mockRequest.mock.calls[0][0]
    const queryStr = typeof query === "string" ? query : print(query)
    expect(queryStr).toContain("is_noise")
  })
})
