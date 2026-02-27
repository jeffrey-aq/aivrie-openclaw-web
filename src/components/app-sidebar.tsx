"use client"

import * as React from "react"
import Link from "next/link"
import {
  BookOpen,
  Brain,
  Search,
  Users,
  Video,
  Youtube,
  MessageSquare,
  Clock,
  FileText,
  Network,
  Inbox,
  Lightbulb,
  Database,
  BarChart3,
  Play,
  ThumbsUp,
  Settings,
  UserCog,
  Send,
  LayoutDashboard,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"
import { VersionBadge } from "@/components/version-badge"
import { ThemeToggle } from "@/components/theme-toggle"

const data = {
  navMain: [
    {
      title: "CRM",
      url: "/crm",
      icon: Users,
      color: "text-blue-500",
      items: [
        {
          title: "Dashboard",
          url: "/crm",
          icon: LayoutDashboard,
        },
        {
          title: "Contacts",
          url: "/crm/contacts",
          icon: Users,
        },
        {
          title: "Interactions",
          url: "/crm/interactions",
          icon: MessageSquare,
        },
        {
          title: "Follow-ups",
          url: "/crm/follow-ups",
          icon: Clock,
        },
      ],
    },
    {
      title: "Knowledge Base",
      url: "/knowledgebase/sources",
      icon: Brain,
      color: "text-purple-500",
      items: [
        {
          title: "Sources",
          url: "/knowledgebase/sources",
          icon: FileText,
        },
        {
          title: "Entities",
          url: "/knowledgebase/entities",
          icon: Network,
        },
        {
          title: "Ingestion Queue",
          url: "/knowledgebase/ingestion",
          icon: Inbox,
        },
      ],
    },
    {
      title: "YouTube",
      url: "/research",
      icon: Youtube,
      color: "text-red-500",
      items: [
        {
          title: "Dashboard",
          url: "/research",
          icon: LayoutDashboard,
        },
        {
          title: "Creators",
          url: "/research/creators",
          icon: Youtube,
        },
        {
          title: "Videos",
          url: "/research/videos",
          icon: Video,
        },
      ],
    },
    {
      title: "Insights",
      url: "/insights/recommendations",
      icon: Lightbulb,
      color: "text-amber-500",
      items: [
        {
          title: "Recommendations",
          url: "/insights/recommendations",
          icon: Lightbulb,
        },
        {
          title: "Analysis Runs",
          url: "/insights/runs",
          icon: Play,
        },
        {
          title: "Data Sources",
          url: "/insights/sources",
          icon: Database,
        },
        {
          title: "Metrics",
          url: "/insights/metrics",
          icon: BarChart3,
        },
        {
          title: "Feedback",
          url: "/insights/feedback",
          icon: ThumbsUp,
        },
        {
          title: "Preferences",
          url: "/insights/preferences",
          icon: Settings,
        },
        {
          title: "Specialist Personas",
          url: "/insights/personas",
          icon: UserCog,
        },
        {
          title: "Digest Deliveries",
          url: "/insights/deliveries",
          icon: Send,
        },
      ],
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <BookOpen className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Aivrie</span>
                  <span className="truncate text-xs">OpenClaw Dashboard</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <ThemeToggle />
        <VersionBadge />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
