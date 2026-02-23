"use client"

import { useMemo } from "react"
import { useAuth } from "@/components/auth-provider"
import { getGraphQLClient } from "@/lib/graphql"

export function useGraphQLClient() {
  const { session } = useAuth()
  const accessToken = session?.access_token

  return useMemo(() => getGraphQLClient(accessToken), [accessToken])
}
