"use client"

import { useEffect, useState } from "react"

const version = process.env.NEXT_PUBLIC_APP_VERSION || "0.0.1"
const hash = process.env.NEXT_PUBLIC_COMMIT_HASH || "unknown"
const commitDate = process.env.NEXT_PUBLIC_COMMIT_DATE || ""
const env = process.env.NEXT_PUBLIC_ENVIRONMENT || "develop"

const envLabels: Record<string, string> = {
  production: "Production",
  staging: "Staging",
  develop: "Develop",
}

const envColors: Record<string, string> = {
  production: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  staging: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  develop: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return "yesterday"
  return `${days}d ago`
}

function CommitAge({ date }: { date: string }) {
  const [ago, setAgo] = useState("")

  useEffect(() => {
    if (!date) return
    setAgo(timeAgo(date))
    const id = setInterval(() => setAgo(timeAgo(date)), 60_000)
    return () => clearInterval(id)
  }, [date])

  if (!ago) return null
  return <span>{ago}</span>
}

function CommitDate({ date }: { date: string }) {
  const [formatted, setFormatted] = useState("")

  useEffect(() => {
    setFormatted(
      new Date(date).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    )
  }, [date])

  if (!formatted) return null
  return <span>{formatted}</span>
}

const envUrls: Record<string, string> = {
  develop: "http://localhost:3000/",
  staging: "https://aivrie-openclaw-web-git-staging-jeffrey-shmigelskys-projects.vercel.app/",
  production: "https://aivrie-openclaw-web.vercel.app/",
}

export function EnvironmentBadge() {
  return (
    <div className="relative inline-block">
      <select
        value={env}
        onChange={(e) => {
          const url = envUrls[e.target.value]
          if (url) window.location.href = url
        }}
        className={`appearance-none cursor-pointer rounded-md px-3 py-1 pr-7 text-sm font-bold tracking-wide uppercase border-0 outline-none ${envColors[env] || envColors.develop}`}
      >
        {Object.entries(envLabels).map(([key, label]) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </select>
      <svg className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 size-3.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  )
}

export function VersionBadge() {
  return (
    <div className="flex flex-col gap-0.5 px-3 py-2 text-sm text-muted-foreground group-data-[collapsible=icon]:hidden">
      <div className="flex items-center gap-2">
        <span className="font-bold">v{version}</span>
        <span className="ml-auto text-xs">+{hash}</span>
      </div>
      {commitDate && (
        <div className="flex items-center gap-2 text-xs">
          <CommitDate date={commitDate} />
          <span className="ml-auto font-bold"><CommitAge date={commitDate} /></span>
        </div>
      )}
    </div>
  )
}
