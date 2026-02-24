"use client"

import { useEffect, useState } from "react"
import { Switch } from "@/components/ui/switch"

export function ThemeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem("theme")
    const prefersDark = stored === "dark" || (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches)
    setDark(prefersDark)
    document.documentElement.classList.toggle("dark", prefersDark)
  }, [])

  function toggle(checked: boolean) {
    setDark(checked)
    document.documentElement.classList.toggle("dark", checked)
    localStorage.setItem("theme", checked ? "dark" : "light")
  }

  return (
    <label className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-sidebar-foreground cursor-pointer group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
      <Switch checked={dark} onCheckedChange={toggle} />
      <span className="group-data-[collapsible=icon]:hidden select-none">
        Display Mode
      </span>
    </label>
  )
}
