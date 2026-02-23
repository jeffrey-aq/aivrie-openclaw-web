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
  production: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  staging: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
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

export function VersionBadge() {
  return (
    <div className="flex flex-col gap-0.5 px-3 py-2 text-sm text-muted-foreground group-data-[collapsible=icon]:hidden">
      <div className="flex items-center gap-2">
        <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${envColors[env] || envColors.develop}`}>
          {envLabels[env] || env}
        </span>
        <span className="flex-1 text-center font-bold">v{version}</span>
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
