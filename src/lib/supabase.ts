import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const supabaseResearch = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: "research" },
})

export const supabaseCrm = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: "crm" },
})

export const supabaseKb = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: "knowledgebase" },
})
