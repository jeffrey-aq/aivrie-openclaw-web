const version = process.env.NEXT_PUBLIC_APP_VERSION || "0.0.1"
const hash = process.env.NEXT_PUBLIC_COMMIT_HASH || "unknown"
const env = process.env.NEXT_PUBLIC_ENVIRONMENT || "develop"

const envColors: Record<string, string> = {
  production: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  staging: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  develop: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
}

export function VersionBadge() {
  return (
    <div className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground">
      <span className={`rounded px-1.5 py-0.5 font-medium ${envColors[env] || envColors.develop}`}>
        {env}
      </span>
      <span>v{version}+{hash}</span>
    </div>
  )
}
