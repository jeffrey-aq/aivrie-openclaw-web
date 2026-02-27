"use client"

import { useState, useRef, useEffect } from "react"
import type { Margin, ChartDimensions } from "./types"

const DEFAULT_MARGIN: Margin = { top: 10, right: 20, bottom: 40, left: 50 }

export function useChartDimensions(
  margin: Margin = DEFAULT_MARGIN,
): [React.RefObject<HTMLDivElement | null>, ChartDimensions] {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [height, setHeight] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect
        setWidth(w)
        setHeight(h)
      }
    })

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const dimensions: ChartDimensions = {
    width,
    height,
    innerWidth: Math.max(width - margin.left - margin.right, 0),
    innerHeight: Math.max(height - margin.top - margin.bottom, 0),
    margin,
  }

  return [ref, dimensions]
}
