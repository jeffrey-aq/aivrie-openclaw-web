"use client"

import type { ReactNode } from "react"
import { TOOLTIP_STYLE } from "@/components/research/chart-utils"

interface ChartTooltipProps {
  x: number
  y: number
  visible: boolean
  containerWidth: number
  containerHeight: number
  children: ReactNode
}

export function ChartTooltip({
  x,
  y,
  visible,
  containerWidth,
  containerHeight,
  children,
}: ChartTooltipProps) {
  if (!visible) return null

  const flipX = x > containerWidth - 200
  const flipY = y > containerHeight - 100

  const style: React.CSSProperties = {
    ...TOOLTIP_STYLE,
    position: "absolute",
    pointerEvents: "none",
    left: flipX ? undefined : x + 12,
    right: flipX ? containerWidth - x + 12 : undefined,
    top: flipY ? undefined : y - 12,
    bottom: flipY ? containerHeight - y + 12 : undefined,
    zIndex: 50,
  }

  return (
    <div style={style} className="p-2 shadow-lg">
      {children}
    </div>
  )
}
