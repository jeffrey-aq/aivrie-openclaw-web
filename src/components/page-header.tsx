"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogOut, ChevronDown } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { EnvironmentBadge } from "@/components/version-badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

const dashboardTabs = [
  { label: "Overview", href: "/" },
  { label: "CRM", href: "/crm" },
  { label: "YouTube", href: "/research" },
]

function isTabActive(tabHref: string, pathname: string): boolean {
  if (tabHref === "/") return pathname === "/"
  if (tabHref === "/crm") return pathname.startsWith("/crm")
  if (tabHref === "/research/creators") return pathname.startsWith("/research")
  return false
}

export function PageHeader({
  section,
  sectionHref,
  page,
}: {
  section: string
  sectionHref: string
  page: string
}) {
  const { user, signOut } = useAuth()
  const pathname = usePathname()

  const name =
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User"
  const email = user?.email || ""
  const avatarUrl = user?.user_metadata?.avatar_url || ""
  const initials = name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <>
      {/* Top header bar: sidebar trigger, dashboard tabs, env badge, user menu */}
      <header className="header-accent flex h-12 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        <nav className="flex items-center gap-1">
          {dashboardTabs.map((tab) => {
            const active = isTabActive(tab.href, pathname)
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                {tab.label}
              </Link>
            )
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <EnvironmentBadge />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-accent transition-colors">
                <Avatar className="h-7 w-7 rounded-full">
                  <AvatarImage src={avatarUrl} alt={name} />
                  <AvatarFallback className="rounded-full text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline font-medium">{name}</span>
                <ChevronDown className="size-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-lg">
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-2 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-full">
                    <AvatarImage src={avatarUrl} alt={name} />
                    <AvatarFallback className="rounded-full">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{name}</span>
                    <span className="truncate text-xs text-muted-foreground">{email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut}>
                <LogOut className="size-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Breadcrumb bar below the header */}
      <div className="flex h-10 items-center gap-2 border-b bg-muted/30 px-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink asChild><Link href={sectionHref}>{section}</Link></BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>{page}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </>
  )
}
