import { GraphQLClient } from "graphql-request"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export function getGraphQLClient(accessToken?: string): GraphQLClient {
  return new GraphQLClient(`${supabaseUrl}/graphql/v1`, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken ?? supabaseAnonKey}`,
    },
  })
}

interface Edge<T> {
  node: T
}

interface Connection<T> {
  edges: Edge<T>[]
}

export function extractNodes<T>(connection: Connection<T>): T[] {
  return connection.edges.map((edge) => edge.node)
}
