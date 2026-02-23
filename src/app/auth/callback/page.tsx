"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase-client"

export default function AuthCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check for error in URL hash (Supabase returns errors there)
    const hash = window.location.hash
    if (hash) {
      const params = new URLSearchParams(hash.substring(1))
      const errorDesc = params.get("error_description")
      if (errorDesc) {
        setError("User not authorized")
        return
      }
    }

    // Check for error in query params
    const searchParams = new URLSearchParams(window.location.search)
    const errorParam = searchParams.get("error_description") || searchParams.get("error")
    if (errorParam) {
      setError("User not authorized")
      return
    }

    supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        router.replace("/")
      }
    })
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
