const KEY = "wt_session_v1"

export type Session = { loggedAt: number }

export function getSession(): Session | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

export function setSession() {
  localStorage.setItem(KEY, JSON.stringify({ loggedAt: Date.now() }))
}

export function clearSession() {
  localStorage.removeItem(KEY)
}
