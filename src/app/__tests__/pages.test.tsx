import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, cleanup } from "@testing-library/react"
import { print } from "graphql"

// Mock graphql module — vi.hoisted ensures mockRequest is available when vi.mock runs
const { mockRequest } = vi.hoisted(() => ({
  mockRequest: vi.fn(),
}))
vi.mock("@/lib/graphql", () => ({
  getGraphQLClient: () => ({ request: mockRequest }),
  extractNodes: <T,>(connection: { edges: { node: T }[] }): T[] =>
    connection.edges.map((e) => e.node),
}))

// Mock auth provider so useAuth returns a session with an access token
vi.mock("@/components/auth-provider", () => ({
  useAuth: () => ({
    session: { access_token: "test-token" },
    user: { email: "test@test.com" },
    loading: false,
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
  }),
}))

// Mock next/navigation for useSearchParams
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}))

// Mock page-header to avoid sidebar context dependency
vi.mock("@/components/page-header", () => ({
  PageHeader: () => null,
}))

// Mock recharts to avoid SSR issues in tests
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => children,
  BarChart: () => null,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}))

// Page imports (mock is hoisted, so these get the mocked graphqlClient)
import React from "react"
import HomePage from "@/app/page"
import CrmDashboardPage from "@/app/crm/page"
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
    collection: "contactsCollection",
    node: {
      id: "c1",
      fullName: "Alice Smith",
      company: "Acme",
      role: "CEO",
      relationshipHealthScore: 80,
      interactionCount: 5,
      lastInteractionAt: "2024-01-01T00:00:00Z",
      source: "email",
    },
    assertText: "Alice Smith",
  },
  {
    name: "Follow-ups",
    Component: FollowUpsPage,
    collection: "followUpsCollection",
    node: {
      id: "f1",
      note: "Check in next week",
      dueDate: "2024-02-01",
      status: "pending",
      snoozedUntil: null,
      contact: { fullName: "Jane Doe" },
    },
    assertText: "Jane Doe",
  },
  {
    name: "Interactions",
    Component: InteractionsPage,
    collection: "interactionsCollection",
    node: {
      id: "i1",
      type: "email_sent",
      subject: "Hello",
      snippet: "Hi there",
      occurredAt: "2024-01-15T10:00:00Z",
      contact: { fullName: "John Doe" },
    },
    assertText: "John Doe",
  },
  {
    name: "YouTube Creators",
    Component: CreatorsPage,
    collection: "youtubeCreatorsCollection",
    node: {
      id: "cr1",
      title: "TechChannel",
      channelId: "UC123",
      subscribers: 150000,
      totalViews: 5000000,
      videoCount: 200,
      niche: "Technology",
      status: "Active",
      competitiveThreat: "Medium",
      uploadFrequency: "Weekly",
      lastUploadDate: "2024-01-20",
      avatarUrl: "https://example.com/avatar.jpg",
      bannerUrl: null,
      description: "A tech channel",
      keywords: ["tech", "coding"],
      country: "US",
      topicCategories: ["Technology"],
      trailerVideoId: null,
    },
    assertText: "TechChannel",
  },
  {
    name: "YouTube Videos",
    Component: VideosPage,
    collection: "youtubeVideosCollection",
    node: {
      id: "v1",
      title: "How to Code",
      videoId: "abc123",
      channelId: "UC123",
      type: "tutorial",
      views: 10000,
      likes: 500,
      comments: 50,
      publishedDate: "2024-01-10",
      status: "Published",
      workstream: "Education",
      thumbnailUrl: "https://example.com/thumb.jpg",
      description: "A coding tutorial",
      captionAvailable: true,
      language: "en",
      definition: "hd",
      topicCategories: ["Education"],
      categoryId: 27,
    },
    extraData: {
      youtubeCreatorsCollection: { edges: [{ node: { channelId: "UC123", title: "TechChannel" } }] },
    },
    assertText: "How to Code",
  },
  {
    name: "KB Sources",
    Component: KbSourcesPage,
    collection: "sourcesCollection",
    node: {
      id: "ks1",
      title: "Research Paper",
      sourceType: "article",
      url: "https://example.com/paper",
      author: "Dr. Smith",
      siteName: "ArXiv",
      publishedAt: "2024-01-05T00:00:00Z",
      wordCount: 5000,
    },
    assertText: "Research Paper",
  },
  {
    name: "Entities",
    Component: EntitiesPage,
    collection: "entitiesCollection",
    node: {
      id: "e1",
      name: "Bitcoin",
      entityType: "cryptocurrency",
      description: "Digital currency",
      mentionCount: 42,
      aliases: ["BTC"],
    },
    assertText: "Bitcoin",
  },
  {
    name: "Ingestion Queue",
    Component: IngestionPage,
    collection: "ingestionQueueCollection",
    node: {
      id: "iq1",
      url: "https://example.com/article",
      status: "completed",
      requiresBrowser: false,
      retryCount: 0,
      lastError: null,
      createdAt: "2024-01-01T00:00:00Z",
    },
    assertText: "https://example.com/article",
  },
  {
    name: "Recommendations",
    Component: RecommendationsPage,
    collection: "recommendationsCollection",
    node: {
      id: "r1",
      number: 1,
      title: "Optimize Pipeline",
      description: "Improve data pipeline efficiency",
      impact: "high",
      effort: "medium",
      urgency: "soon",
      category: "Engineering",
      confidenceScore: 0.85,
      status: "pending",
      isContradiction: false,
      createdAt: "2024-01-01T00:00:00Z",
    },
    assertText: "Optimize Pipeline",
  },
  {
    name: "Analysis Runs",
    Component: RunsPage,
    collection: "analysisRunsCollection",
    node: {
      id: "ar1",
      runDate: "2024-06-01",
      status: "completed",
      specialistsSpawned: 5,
      specialistsCompleted: 5,
      recommendationsGenerated: 12,
      durationSeconds: 120,
      errorMessage: null,
      startedAt: "2024-06-01T08:00:00Z",
    },
    assertText: "completed",
  },
  {
    name: "Data Sources",
    Component: DataSourcesPage,
    collection: "dataSourcesCollection",
    node: {
      id: "ds1",
      name: "email_inbox",
      displayName: "Email Inbox",
      category: "communication",
      isActive: true,
      syncFrequencyHours: 6,
      lastSyncAt: "2024-01-20T12:00:00Z",
    },
    assertText: "Email Inbox",
  },
  {
    name: "Metrics",
    Component: MetricsPage,
    collection: "aggregatedMetricsCollection",
    node: {
      id: "m1",
      metricName: "response_time",
      aggregationType: "avg",
      period: "daily",
      periodStart: "2024-01-01",
      periodEnd: "2024-01-02",
      value: 250,
      sampleCount: 100,
      dimension1: "api",
    },
    assertText: "response_time",
  },
  {
    name: "Feedback",
    Component: FeedbackPage,
    collection: "feedbackEventsCollection",
    node: {
      id: "fe1",
      action: "approved",
      reason: "Good suggestion",
      recommendationType: "optimization",
      impactLevel: "high",
      wasSuccessful: true,
      outcomeNotes: null,
      createdAt: "2024-01-15T00:00:00Z",
    },
    assertText: "approved",
  },
  {
    name: "Preferences",
    Component: PreferencesPage,
    collection: "preferencePatternsCollection",
    node: {
      id: "pp1",
      patternType: "scheduling",
      patternKey: "timezone",
      patternValue: { value: "UTC" },
      confidence: 0.9,
      sampleCount: 50,
      updatedAt: "2024-01-20T00:00:00Z",
    },
    assertText: "timezone",
  },
  {
    name: "Specialist Personas",
    Component: PersonasPage,
    collection: "specialistPersonasCollection",
    node: {
      id: "sp1",
      name: "market_analyst",
      displayName: "Market Analyst",
      focus: "Financial market trends",
      systemPrompt: "You are a market analyst.",
      dataSources: ["email_inbox", "news_feed"],
      isActive: true,
      model: "claude-sonnet-4-6",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    },
    assertText: "market_analyst",
  },
  {
    name: "Digest Deliveries",
    Component: DeliveriesPage,
    collection: "digestDeliveriesCollection",
    node: {
      id: "dd1",
      telegramMessageId: "12345",
      telegramChatId: "-100999",
      telegramTopicId: "42",
      recommendationNumbers: [1, 3, 5],
      deliveredAt: "2024-01-20T08:00:00Z",
      createdAt: "2024-01-20T08:00:00Z",
    },
    assertText: "1, 3, 5",
  },
]

describe("Page rendering", () => {
  beforeEach(() => {
    cleanup()
    mockRequest.mockReset()
  })

  it.each(pageTests)(
    "$name page renders table with data",
    async ({ Component, collection, node, assertText, extraData }) => {
      mockRequest.mockResolvedValueOnce({
        [collection]: { edges: [{ node }] },
        ...extraData,
      })

      render(<Component />)

      expect(await screen.findByText(assertText)).toBeInTheDocument()
    }
  )

  it("personas query targets specialistPersonasCollection", async () => {
    mockRequest.mockResolvedValueOnce({
      specialistPersonasCollection: { edges: [{ node: {
        id: "sp1", name: "test_persona", displayName: "Test", focus: "Testing",
        systemPrompt: "prompt", dataSources: [], isActive: true,
        model: "claude-sonnet-4-6", createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      }}] },
    })

    render(<PersonasPage />)
    await screen.findByText("test_persona")

    const query = mockRequest.mock.calls[0][0]
    const queryStr = typeof query === "string" ? query : print(query)
    expect(queryStr).toContain("specialistPersonasCollection")
  })

  it("deliveries query targets digestDeliveriesCollection", async () => {
    mockRequest.mockResolvedValueOnce({
      digestDeliveriesCollection: { edges: [{ node: {
        id: "dd1", telegramMessageId: "999", telegramChatId: "-100",
        telegramTopicId: null, recommendationNumbers: [2, 4],
        deliveredAt: "2024-01-20T08:00:00Z", createdAt: "2024-01-20T08:00:00Z",
      }}] },
    })

    render(<DeliveriesPage />)
    await screen.findByText("2, 4")

    const query = mockRequest.mock.calls[0][0]
    const queryStr = typeof query === "string" ? query : print(query)
    expect(queryStr).toContain("digestDeliveriesCollection")
  })

  it("dashboard renders section headers and counts", async () => {
    const mockCounts: Record<string, { edges: { node: { nodeId: string } }[] }> = {}
    const collections = [
      "contactsCollection", "interactionsCollection", "followUpsCollection",
      "youtubeCreatorsCollection", "youtubeVideosCollection",
      "sourcesCollection", "entitiesCollection", "ingestionQueueCollection",
      "recommendationsCollection", "analysisRunsCollection",
      "dataSourcesCollection", "aggregatedMetricsCollection",
      "feedbackEventsCollection", "preferencePatternsCollection",
      "specialistPersonasCollection", "digestDeliveriesCollection",
    ]
    collections.forEach((col, i) => {
      mockCounts[col] = {
        edges: Array.from({ length: i + 1 }, (_, j) => ({ node: { nodeId: `${col}-${j}` } })),
      }
    })

    mockRequest.mockResolvedValueOnce(mockCounts)

    render(<HomePage />)

    // Section headers render
    expect(await screen.findByText("CRM")).toBeInTheDocument()
    expect(screen.getByText("Knowledge Base")).toBeInTheDocument()
    expect(screen.getByText("Insights")).toBeInTheDocument()
    expect(screen.getByText("YouTube")).toBeInTheDocument()

    // All 16 item labels render
    expect(screen.getByText("Contacts")).toBeInTheDocument()
    expect(screen.getByText("Videos")).toBeInTheDocument()
    expect(screen.getByText("Digest Deliveries")).toBeInTheDocument()

    // All 16 count spans render (one per collection)
    const boldSpans = document.querySelectorAll("span.text-lg.font-bold")
    expect(boldSpans).toHaveLength(16)
    // First rendered item is Contacts (CRM section first) = 1 edge
    expect(boldSpans[0].textContent).toBe("1")
  })

  it("dashboard shows error state when request fails", async () => {
    mockRequest.mockRejectedValueOnce(new Error("Network error"))

    render(<HomePage />)

    expect(await screen.findByText("Failed to load counts.")).toBeInTheDocument()
  })

  it("dashboard query fetches all 16 collections", async () => {
    const mockCounts: Record<string, { edges: { node: { nodeId: string } }[] }> = {}
    const collections = [
      "contactsCollection", "interactionsCollection", "followUpsCollection",
      "youtubeCreatorsCollection", "youtubeVideosCollection",
      "sourcesCollection", "entitiesCollection", "ingestionQueueCollection",
      "recommendationsCollection", "analysisRunsCollection",
      "dataSourcesCollection", "aggregatedMetricsCollection",
      "feedbackEventsCollection", "preferencePatternsCollection",
      "specialistPersonasCollection", "digestDeliveriesCollection",
    ]
    collections.forEach((col) => {
      mockCounts[col] = { edges: [{ node: { nodeId: `${col}-0` } }] }
    })

    mockRequest.mockResolvedValueOnce(mockCounts)

    render(<HomePage />)
    await screen.findByText("CRM")

    const query = mockRequest.mock.calls[0][0]
    const queryStr = typeof query === "string" ? query : print(query)
    collections.forEach((col) => {
      expect(queryStr).toContain(col)
    })
  })

  it("contacts query includes isNoise filter", async () => {
    mockRequest.mockResolvedValueOnce({
      contactsCollection: {
        edges: [
          {
            node: {
              id: "c1",
              fullName: "Test",
              company: null,
              role: null,
              relationshipHealthScore: 50,
              interactionCount: 0,
              lastInteractionAt: null,
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
    expect(queryStr).toContain("isNoise")
  })

  it("CRM dashboard renders summary cards and chart sections", async () => {
    const now = new Date().toISOString()
    mockRequest.mockResolvedValueOnce({
      contactsCollection: { edges: [
        { node: { createdAt: now, updatedAt: now } },
        { node: { createdAt: now, updatedAt: now } },
      ] },
      interactionsCollection: { edges: [
        { node: { createdAt: now, updatedAt: now } },
      ] },
      followUpsCollection: { edges: [] },
    })

    render(<CrmDashboardPage />)

    expect(await screen.findByText("CRM Dashboard")).toBeInTheDocument()
    expect(screen.getByText("Contacts")).toBeInTheDocument()
    expect(screen.getByText("Interactions")).toBeInTheDocument()
    expect(screen.getByText("Follow-ups")).toBeInTheDocument()
    expect(screen.getByText("2")).toBeInTheDocument() // 2 contacts
    expect(screen.getByText("Contacts Activity")).toBeInTheDocument()
    expect(screen.getByText("Interactions Activity")).toBeInTheDocument()
    expect(screen.getByText("Follow-ups Activity")).toBeInTheDocument()
  })

  it("CRM dashboard shows error when request fails", async () => {
    mockRequest.mockRejectedValueOnce(new Error("Network error"))

    render(<CrmDashboardPage />)

    expect(await screen.findByText("Failed to load dashboard data.")).toBeInTheDocument()
  })

  it("videos page includes creator filter in query", async () => {
    mockRequest.mockResolvedValueOnce({
      youtubeVideosCollection: { edges: [{ node: {
        id: "v1", title: "Test Video", videoId: "vid1", channelId: "UC123",
        type: null, views: 100, likes: 10, comments: 5,
        publishedDate: "2024-01-10", status: "Published", workstream: null,
      }}] },
      youtubeCreatorsCollection: { edges: [{ node: {
        channelId: "UC123", title: "TestCreator",
      }}] },
    })

    render(<VideosPage />)
    await screen.findByText("Test Video")

    // Creator name resolved from lookup (appears in table row and dropdown)
    expect(screen.getAllByText("TestCreator").length).toBeGreaterThanOrEqual(1)
  })

  it("creators query includes YouTube metadata fields", async () => {
    mockRequest.mockResolvedValueOnce({
      youtubeCreatorsCollection: { edges: [{ node: {
        id: "cr1", title: "MetaCreator", channelId: "UC_META",
        videoCount: 10, viewsToSubRatio: null, avgViewsPerVideo: 5000,
        uploadFrequency: "Weekly", contentTypes: null, topContentType: null,
        typicalVideoLength: null, estRevenueRange: null, otherVentures: null,
        monetization: null, strengths: null, opportunities: null,
        keyInsights: null, competitiveThreat: "Low", lastAnalyzedDate: null,
        status: "Active", workstream: "YouTube", notes: null,
        avatarUrl: "https://example.com/avatar.jpg", bannerUrl: null,
        description: "Test channel", keywords: ["test"], country: "US",
        topicCategories: ["Tech"], trailerVideoId: null,
      }}] },
    })

    render(<CreatorsPage />)
    await screen.findByText("MetaCreator")

    const query = mockRequest.mock.calls[0][0]
    const queryStr = typeof query === "string" ? query : print(query)
    expect(queryStr).toContain("avatarUrl")
    expect(queryStr).toContain("bannerUrl")
    expect(queryStr).toContain("keywords")
    expect(queryStr).toContain("country")
    expect(queryStr).toContain("topicCategories")
    expect(queryStr).toContain("trailerVideoId")
  })

  it("videos query includes YouTube metadata fields", async () => {
    mockRequest.mockResolvedValueOnce({
      youtubeVideosCollection: { edges: [{ node: {
        id: "v1", title: "MetaVideo", videoId: "vid_meta", channelId: "UC123",
        type: null, views: 100, likes: 10, comments: 5,
        publishedDate: "2024-01-10", status: "Published", workstream: null,
        thumbnailUrl: "https://example.com/thumb.jpg", description: "A video",
        captionAvailable: true, language: "en", definition: "hd",
        topicCategories: ["Education"], categoryId: 27,
      }}] },
      youtubeCreatorsCollection: { edges: [{ node: {
        channelId: "UC123", title: "TestCreator",
      }}] },
    })

    render(<VideosPage />)
    await screen.findByText("MetaVideo")

    const query = mockRequest.mock.calls[0][0]
    const queryStr = typeof query === "string" ? query : print(query)
    expect(queryStr).toContain("thumbnailUrl")
    expect(queryStr).toContain("captionAvailable")
    expect(queryStr).toContain("language")
    expect(queryStr).toContain("definition")
    expect(queryStr).toContain("topicCategories")
    expect(queryStr).toContain("categoryId")
  })

  it("creators page links to videos filtered by channelId", async () => {
    mockRequest.mockResolvedValueOnce({
      youtubeCreatorsCollection: { edges: [{ node: {
        id: "cr1", title: "LinkCreator", channelId: "UC_LINK",
        videoCount: 10, viewsToSubRatio: null, avgViewsPerVideo: 5000,
        uploadFrequency: "Weekly", contentTypes: null, topContentType: null,
        typicalVideoLength: null, estRevenueRange: null, otherVentures: null,
        monetization: null, strengths: null, opportunities: null,
        keyInsights: null, competitiveThreat: "Low", lastAnalyzedDate: null,
        status: "Active", workstream: "YouTube", notes: null,
      }}] },
    })

    render(<CreatorsPage />)
    const link = await screen.findByText("LinkCreator")
    expect(link.closest("a")).toHaveAttribute("href", "/research/videos?creator=UC_LINK")
  })
})
