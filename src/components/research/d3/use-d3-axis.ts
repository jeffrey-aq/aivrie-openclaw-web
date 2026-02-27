"use client"

import { useEffect, useRef } from "react"
import { select } from "d3-selection"
import type { Axis, AxisDomain } from "d3-axis"

export function useD3Axis<Domain extends AxisDomain>(
  axis: Axis<Domain> | null,
  deps: unknown[] = [],
) {
  const ref = useRef<SVGGElement>(null)

  useEffect(() => {
    if (!ref.current || !axis) return
    const g = select(ref.current)
    g.call(axis)
    g.selectAll(".tick text")
      .attr("fill", "var(--color-muted-foreground)")
      .attr("font-size", "11px")
    g.selectAll(".tick line").attr("stroke", "var(--color-border)")
    g.select(".domain").attr("stroke", "var(--color-border)")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [axis, ...deps])

  return ref
}
