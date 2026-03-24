import { createClient } from "@/lib/supabase/client"

/**
 * Returns a Supabase session if the user logged in via Google OAuth,
 * or a minimal object if they used the password fallback.
 * Returns null if not authenticated.
 */
export async function getSession() {
  // Check Supabase OAuth session first
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (session) return session

  // Fallback: check password-based cookie
  if (typeof document !== "undefined" && document.cookie.includes("wt_pass_auth=1")) {
    return { user: { email: "password-user" }, access_token: "" } as unknown as NonNullable<typeof session>
  }

  return null
}

export async function signOut() {
  const supabase = createClient()
  await supabase.auth.signOut()
  // Also clear the password cookie
  if (typeof document !== "undefined") {
    document.cookie = "wt_pass_auth=; path=/; max-age=0"
  }
}
