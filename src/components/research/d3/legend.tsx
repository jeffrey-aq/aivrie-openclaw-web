interface LegendEntry {
  label: string
  color: string
  shape?: "circle" | "square" | "line"
}

export function ChartLegend({
  entries,
  className,
}: {
  entries: LegendEntry[]
  className?: string
}) {
  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-4 text-xs ${className ?? ""}`}
    >
      {entries.map((entry) => (
        <div key={entry.label} className="flex items-center gap-1.5">
          {entry.shape === "line" ? (
            <svg width={16} height={3}>
              <line
                x1={0}
                y1={1.5}
                x2={16}
                y2={1.5}
                stroke={entry.color}
                strokeWidth={2}
                strokeDasharray="4 2"
              />
            </svg>
          ) : (
            <span
              className={`inline-block size-2.5 ${entry.shape === "square" ? "rounded-sm" : "rounded-full"}`}
              style={{ backgroundColor: entry.color }}
            />
          )}
          <span className="text-muted-foreground">{entry.label}</span>
        </div>
      ))}
    </div>
  )
}
