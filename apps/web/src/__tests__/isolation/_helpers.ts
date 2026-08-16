import type { SupabaseClient } from '@supabase/supabase-js'

// admin.auth.admin.getUserByEmail() was removed from @supabase/supabase-js's
// admin API — confirmed 2026-08-16 against v2.110.3, no such method exists
// (only listUsers/getUserById/createUser/etc). This was silently breaking
// every isolation test file that used it. listUsers() has no server-side
// email filter, so this pages through and filters client-side; a high
// perPage keeps it to one request for the handful of users a test project
// actually has.
export async function getUserByEmail(admin: SupabaseClient, email: string) {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (error) return { data: { user: null }, error }
  const user = data.users.find(u => u.email === email) ?? null
  return { data: { user }, error: null }
}

// Some test files call signInWithPassword() once per `test()` case instead
// of once per file — with 20+ cases that's 20+ real logins in a few
// seconds, which trips Supabase Auth's own sign-in rate limit (confirmed
// 2026-08-16: hit "Request rate limit reached" on a completely fresh run,
// not just from repeated local retries). Caching by email+url for the
// process lifetime means each test file authenticates each fixture user
// at most once, however many tests use it.
const sessionCache = new Map<string, Promise<SupabaseClient>>()

export function cachedSignIn(
  createClient: () => SupabaseClient,
  url: string,
  email: string,
  password: string,
): Promise<SupabaseClient> {
  const key = `${url}:${email}`
  let cached = sessionCache.get(key)
  if (!cached) {
    cached = (async () => {
      const client = createClient()
      const { error } = await client.auth.signInWithPassword({ email, password })
      if (error) throw new Error(`Login failed for ${email}: ${error.message}`)
      return client
    })()
    sessionCache.set(key, cached)
  }
  return cached
}
