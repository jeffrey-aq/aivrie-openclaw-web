"use client"

import { Badge } from "@/components/ui/badge"

// ===================== SHARED =====================

function ColorBadge({ value, colors }: { value: string | null; colors: Record<string, string> }) {
  if (!value) return <span className="text-muted-foreground">—</span>
  return (
    <Badge variant="outline" className={`border-transparent ${colors[value] || ""}`}>
      {value}
    </Badge>
  )
}

function MultiBadge({ values, colors }: { values: string[] | null; colors: Record<string, string> }) {
  if (!values || values.length === 0) return <span className="text-muted-foreground">—</span>
  return (
    <div className="flex flex-wrap gap-1">
      {values.map((v) => (
        <Badge key={v} variant="outline" className={`border-transparent ${colors[v] || ""}`}>
          {v}
        </Badge>
      ))}
    </div>
  )
}

// ===================== RESEARCH SCHEMA =====================

const uploadFrequencyColors: Record<string, string> = {
  "Daily": "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  "3-4x/week": "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  "Weekly": "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400",
  "Bi-Weekly": "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  "Monthly": "bg-rose-500/15 text-rose-700 dark:text-rose-400",
  "Irregular": "bg-orange-500/15 text-orange-700 dark:text-orange-400",
}

const contentTypeColors: Record<string, string> = {
  "News": "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400",
  "Tutorials": "bg-teal-500/15 text-teal-700 dark:text-teal-400",
  "Case Studies": "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  "Coding": "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
  "Interviews": "bg-pink-500/15 text-pink-700 dark:text-pink-400",
  "Reviews": "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
  "Tool Demos": "bg-lime-500/15 text-lime-700 dark:text-lime-400",
}

const revenueRangeColors: Record<string, string> = {
  "$50K+/mo": "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  "$10-50k/mo": "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400",
  "$5-10K/mo": "bg-green-500/15 text-green-700 dark:text-green-400",
  "$1-5K/mo": "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400",
  "<$1K/mo": "bg-red-500/15 text-red-700 dark:text-red-400",
}

const monetizationColors: Record<string, string> = {
  "AdSense": "bg-teal-500/15 text-teal-700 dark:text-teal-400",
  "Sponsorships": "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  "Courses": "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  "Newsletter": "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  "Consulting": "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  "Products": "bg-purple-500/15 text-purple-700 dark:text-purple-400",
}

const competitiveThreatColors: Record<string, string> = {
  "High": "bg-red-500/15 text-red-700 dark:text-red-400",
  "Medium": "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400",
  "Low": "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
}

const videoStatusColors: Record<string, string> = {
  "Published": "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  "Draft": "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400",
  "Unlisted": "bg-amber-500/15 text-amber-700 dark:text-amber-400",
}

export function UploadFrequencyBadge({ value }: { value: string | null }) {
  return <ColorBadge value={value} colors={uploadFrequencyColors} />
}

export function ContentTypeBadge({ value }: { value: string | null }) {
  return <ColorBadge value={value} colors={contentTypeColors} />
}

export function RevenueRangeBadge({ value }: { value: string | null }) {
  return <ColorBadge value={value} colors={revenueRangeColors} />
}

export function MonetizationBadges({ values }: { values: string[] | null }) {
  return <MultiBadge values={values} colors={monetizationColors} />
}

export function CompetitiveThreatBadge({ value }: { value: string | null }) {
  return <ColorBadge value={value} colors={competitiveThreatColors} />
}

const durationTypeColors: Record<string, string> = {
  "Short": "bg-pink-500/15 text-pink-700 dark:text-pink-400",
  "Full": "bg-sky-500/15 text-sky-700 dark:text-sky-400",
}

export function VideoStatusBadge({ value }: { value: string | null }) {
  return <ColorBadge value={value} colors={videoStatusColors} />
}

export function DurationTypeBadge({ value }: { value: string | null }) {
  return <ColorBadge value={value} colors={durationTypeColors} />
}

// ===================== CREATOR BADGE (hash-based color) =====================

const CREATOR_PALETTE = [
  "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  "bg-rose-500/15 text-rose-700 dark:text-rose-400",
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
  "bg-pink-500/15 text-pink-700 dark:text-pink-400",
  "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  "bg-teal-500/15 text-teal-700 dark:text-teal-400",
  "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400",
  "bg-lime-500/15 text-lime-700 dark:text-lime-400",
  "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  "bg-red-500/15 text-red-700 dark:text-red-400",
]

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

export function CreatorBadge({ name, channelId }: { name: string | null; channelId: string }) {
  if (!name) return <span className="text-muted-foreground">—</span>
  const color = CREATOR_PALETTE[hashString(channelId) % CREATOR_PALETTE.length]
  return (
    <Badge variant="outline" className={`border-transparent ${color}`}>
      {name}
    </Badge>
  )
}

// ===================== SHARED ACROSS SCHEMAS =====================

const statusColors: Record<string, string> = {
  "Active": "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  "Rising": "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  "Monitoring": "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400",
  "Inactive": "bg-red-500/15 text-red-700 dark:text-red-400",
}

const workstreamColors: Record<string, string> = {
  "Research": "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  "YouTube": "bg-red-500/15 text-red-700 dark:text-red-400",
  "SaaS": "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  "Newsletter": "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  "Apps": "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
  "Courses": "bg-blue-500/15 text-blue-700 dark:text-blue-400",
}

export function StatusBadge({ value }: { value: string | null }) {
  return <ColorBadge value={value} colors={statusColors} />
}

export function WorkstreamBadge({ value }: { value: string | null }) {
  return <ColorBadge value={value} colors={workstreamColors} />
}

// ===================== CRM SCHEMA =====================

const contactSourceColors: Record<string, string> = {
  "gmail": "bg-red-500/15 text-red-700 dark:text-red-400",
  "google_calendar": "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  "manual": "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400",
}

const interactionTypeColors: Record<string, string> = {
  "email_sent": "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  "email_received": "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400",
  "calendar_meeting": "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
}

const followUpStatusColors: Record<string, string> = {
  "pending": "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  "snoozed": "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  "done": "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
}

const duplicateStatusColors: Record<string, string> = {
  "pending": "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  "merged": "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  "dismissed": "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400",
}

export function ContactSourceBadge({ value }: { value: string | null }) {
  return <ColorBadge value={value} colors={contactSourceColors} />
}

export function InteractionTypeBadge({ value }: { value: string | null }) {
  return <ColorBadge value={value} colors={interactionTypeColors} />
}

export function FollowUpStatusBadge({ value }: { value: string | null }) {
  return <ColorBadge value={value} colors={followUpStatusColors} />
}

export function DuplicateStatusBadge({ value }: { value: string | null }) {
  return <ColorBadge value={value} colors={duplicateStatusColors} />
}

// ===================== KNOWLEDGEBASE SCHEMA =====================

const sourceTypeColors: Record<string, string> = {
  "article": "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  "youtube_video": "bg-red-500/15 text-red-700 dark:text-red-400",
  "tweet": "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  "twitter_thread": "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  "pdf": "bg-orange-500/15 text-orange-700 dark:text-orange-400",
}

const entityTypeColors: Record<string, string> = {
  "person": "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  "company": "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  "concept": "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  "product": "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  "technology": "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
}

const ingestionStatusColors: Record<string, string> = {
  "queued": "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400",
  "processing": "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  "completed": "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  "failed": "bg-red-500/15 text-red-700 dark:text-red-400",
}

export function SourceTypeBadge({ value }: { value: string | null }) {
  return <ColorBadge value={value} colors={sourceTypeColors} />
}

export function EntityTypeBadge({ value }: { value: string | null }) {
  return <ColorBadge value={value} colors={entityTypeColors} />
}

export function IngestionStatusBadge({ value }: { value: string | null }) {
  return <ColorBadge value={value} colors={ingestionStatusColors} />
}

// ===================== INSIGHTS SCHEMA =====================

const runStatusColors: Record<string, string> = {
  "running": "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  "completed": "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  "failed": "bg-red-500/15 text-red-700 dark:text-red-400",
  "cancelled": "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400",
}

const recommendationStatusColors: Record<string, string> = {
  "pending": "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  "approved": "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  "rejected": "bg-red-500/15 text-red-700 dark:text-red-400",
  "implemented": "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  "cancelled": "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400",
}

const feedbackActionColors: Record<string, string> = {
  "approved": "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  "rejected": "bg-red-500/15 text-red-700 dark:text-red-400",
  "implemented": "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  "deep_dive": "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  "cancelled": "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400",
}

const impactLevelColors: Record<string, string> = {
  "high": "bg-red-500/15 text-red-700 dark:text-red-400",
  "medium": "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  "low": "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
}

const effortLevelColors: Record<string, string> = {
  "hours": "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  "days": "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  "weeks": "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  "months": "bg-red-500/15 text-red-700 dark:text-red-400",
}

const urgencyLevelColors: Record<string, string> = {
  "now": "bg-red-500/15 text-red-700 dark:text-red-400",
  "soon": "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  "later": "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400",
}

const sourceCategoryColors: Record<string, string> = {
  "content": "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  "sales": "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  "operations": "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  "engagement": "bg-pink-500/15 text-pink-700 dark:text-pink-400",
  "communication": "bg-sky-500/15 text-sky-700 dark:text-sky-400",
}

const timePeriodColors: Record<string, string> = {
  "hourly": "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
  "daily": "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  "weekly": "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400",
  "monthly": "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  "quarterly": "bg-violet-500/15 text-violet-700 dark:text-violet-400",
}

const aggregationTypeColors: Record<string, string> = {
  "sum": "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  "avg": "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  "min": "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
  "max": "bg-red-500/15 text-red-700 dark:text-red-400",
  "count": "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400",
  "median": "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  "p95": "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  "p99": "bg-orange-500/15 text-orange-700 dark:text-orange-400",
}

export function RunStatusBadge({ value }: { value: string | null }) {
  return <ColorBadge value={value} colors={runStatusColors} />
}

export function RecommendationStatusBadge({ value }: { value: string | null }) {
  return <ColorBadge value={value} colors={recommendationStatusColors} />
}

export function FeedbackActionBadge({ value }: { value: string | null }) {
  return <ColorBadge value={value} colors={feedbackActionColors} />
}

export function ImpactLevelBadge({ value }: { value: string | null }) {
  return <ColorBadge value={value} colors={impactLevelColors} />
}

export function EffortLevelBadge({ value }: { value: string | null }) {
  return <ColorBadge value={value} colors={effortLevelColors} />
}

export function UrgencyLevelBadge({ value }: { value: string | null }) {
  return <ColorBadge value={value} colors={urgencyLevelColors} />
}

export function SourceCategoryBadge({ value }: { value: string | null }) {
  return <ColorBadge value={value} colors={sourceCategoryColors} />
}

export function TimePeriodBadge({ value }: { value: string | null }) {
  return <ColorBadge value={value} colors={timePeriodColors} />
}

export function AggregationTypeBadge({ value }: { value: string | null }) {
  return <ColorBadge value={value} colors={aggregationTypeColors} />
}
