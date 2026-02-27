interface GridProps {
  innerWidth: number
  innerHeight: number
  xTicks?: number[]
  yTicks?: number[]
  horizontal?: boolean
  vertical?: boolean
}

export function ChartGrid({
  innerWidth,
  innerHeight,
  xTicks,
  yTicks,
  horizontal = true,
  vertical = true,
}: GridProps) {
  return (
    <g className="opacity-30">
      {horizontal &&
        yTicks?.map((y) => (
          <line
            key={`h-${y}`}
            x1={0}
            x2={innerWidth}
            y1={y}
            y2={y}
            stroke="var(--color-border)"
            strokeDasharray="3 3"
          />
        ))}
      {vertical &&
        xTicks?.map((x) => (
          <line
            key={`v-${x}`}
            x1={x}
            x2={x}
            y1={0}
            y2={innerHeight}
            stroke="var(--color-border)"
            strokeDasharray="3 3"
          />
        ))}
    </g>
  )
}
