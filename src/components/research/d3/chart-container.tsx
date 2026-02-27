"use client"

import type { ReactNode } from "react"
import { useChartDimensions } from "./use-chart-dimensions"
import type { Margin, ChartDimensions } from "./types"

interface ChartContainerProps {
  height: number
  margin?: Margin
  children: (dims: ChartDimensions) => ReactNode
  className?: string
}

export function ChartContainer({
  height,
  margin,
  children,
  className,
}: ChartContainerProps) {
  const [ref, dimensions] = useChartDimensions(margin)

  return (
    <div
      ref={ref}
      className={`relative w-full ${className ?? ""}`}
      style={{ height }}
    >
      {dimensions.width > 0 && (
        <svg width={dimensions.width} height={height}>
          <g
            transform={`translate(${dimensions.margin.left},${dimensions.margin.top})`}
          >
            {children(dimensions)}
          </g>
        </svg>
      )}
    </div>
  )
}
