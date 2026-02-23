"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase-client"

export default function AuthCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function handleCallback() {
      // Check for error in URL hash
      const hash = window.location.hash
      if (hash) {
        const params = new URLSearchParams(hash.substring(1))
        if (params.get("error_description") || params.get("error")) {
          setError("User not authorized")
          return
        }
      }

      // Check for error in query params
      const searchParams = new URLSearchParams(window.location.search)
      if (searchParams.get("error_description") || searchParams.get("error")) {
        setError("User not authorized")
        return
      }

      // Exchange the code for a session (PKCE flow)
      const code = searchParams.get("code")
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          setError("User not authorized")
          return
        }
      }

      router.replace("/")
    }

    handleCallback()
  }, [router])

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-destructive font-medium">{error}</p>
          <a
            href="/"
            className="text-sm text-muted-foreground hover:underline"
          >
            Back to login
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen items-center justify-center">
      <p className="text-muted-foreground">Signing in...</p>
    </div>
  )
}
