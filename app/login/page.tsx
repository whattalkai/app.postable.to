"use client"
import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

const PASS = process.env.NEXT_PUBLIC_STUDIO_PASS ?? "studio2024"

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0A0A0A" }} />
    }>
      <LoginContent />
    </Suspense>
  )
}

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const authError = searchParams.get("error") === "auth"

  const [value, setValue] = useState("")
  const [errorType, setErrorType] = useState<"google" | "password" | "callback" | null>(authError ? "callback" : null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  async function handleGoogle() {
    setGoogleLoading(true)
    setErrorType(null)

    // Safety timeout: if redirect doesn't happen within 10s, reset button
    const timeout = setTimeout(() => {
      console.error("[Login] Google sign-in timeout — redirect never happened")
      setGoogleLoading(false)
      setErrorType("google")
    }, 10000)

    try {
      const supabase = createClient()
      console.log("[Login] Calling signInWithOAuth...", { origin: window.location.origin })
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      console.log("[Login] signInWithOAuth result:", { data, error: error?.message })
      if (error) {
        clearTimeout(timeout)
        console.error("[Login] Google sign-in error:", error.message)
        setErrorType("google")
        setGoogleLoading(false)
      } else if (data?.url) {
        // Explicit redirect — don't rely on auto-redirect
        console.log("[Login] Redirecting to:", data.url.substring(0, 100) + "...")
        window.location.href = data.url
      } else {
        // data exists but no URL — auto-redirect should have happened
        console.log("[Login] No URL in data, expecting auto-redirect...", data)
      }
    } catch (err) {
      clearTimeout(timeout)
      console.error("[Login] Google sign-in exception:", err)
      setErrorType("google")
      setGoogleLoading(false)
    }
  }

  function handlePassword(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErrorType(null)

    if (value === PASS) {
      // Set a simple cookie so server can also check
      document.cookie = "wt_pass_auth=1; path=/; max-age=2592000"
      router.push("/")
    } else {
      setErrorType("password")
      setLoading(false)
      setValue("")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0A0A0A" }}>
      <div style={{
        width: 360,
        background: "#111",
        border: "1px solid #222",
        borderRadius: 16,
        padding: "40px 36px",
        display: "flex",
        flexDirection: "column",
        gap: 24,
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 4 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-white.svg" alt="WhatTalk Studio" style={{ height: 32, margin: "0 auto 16px" }} />
          <div style={{ color: "#fff", fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em" }}>
            WhatTalk Studio
          </div>
          <div style={{ color: "#555", fontSize: 13, marginTop: 4 }}>
            Giriş yapın, devam edin.
          </div>
        </div>

        {/* Google Sign-in */}
        <button
          onClick={handleGoogle}
          disabled={googleLoading}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            background: "#fff",
            color: "#1f1f1f",
            border: "none",
            borderRadius: 8,
            padding: "12px 0",
            fontSize: 15,
            fontWeight: 600,
            cursor: googleLoading ? "not-allowed" : "pointer",
            opacity: googleLoading ? 0.6 : 1,
            transition: "opacity 0.15s",
          }}
        >
          {/* Google icon */}
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.1 24.1 0 0 0 0 21.56l7.98-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          {googleLoading ? "Yönlendiriliyor…" : "Google ile Giriş Yap"}
        </button>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1, height: 1, background: "#222" }} />
          <span style={{ color: "#444", fontSize: 12, fontWeight: 500 }}>veya</span>
          <div style={{ flex: 1, height: 1, background: "#222" }} />
        </div>

        {/* Password login */}
        <form onSubmit={handlePassword} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            type="password"
            placeholder="Parola"
            value={value}
            onChange={e => { setValue(e.target.value); setErrorType(null) }}
            style={{
              background: "#181818",
              border: errorType ? "1px solid #EF4444" : "1px solid #2a2a2a",
              borderRadius: 8,
              color: "#fff",
              fontSize: 15,
              padding: "12px 14px",
              outline: "none",
              transition: "border-color 0.15s",
            }}
          />
          {errorType && (
            <div style={{ color: "#EF4444", fontSize: 13 }}>
              {errorType === "callback"
                ? "Google girişi başarısız. Tekrar deneyin."
                : errorType === "google"
                  ? "Google ile bağlantı kurulamadı. Tekrar deneyin."
                  : "Yanlış parola. Tekrar deneyin."}
            </div>
          )}
          <button
            type="submit"
            disabled={loading || !value}
            style={{
              background: loading || !value ? "#1a1a1a" : "#00C2A8",
              color: loading || !value ? "#444" : "#000",
              border: "none",
              borderRadius: 8,
              padding: "12px 0",
              fontSize: 15,
              fontWeight: 600,
              cursor: loading || !value ? "not-allowed" : "pointer",
              transition: "background 0.15s, color 0.15s",
            }}
          >
            {loading ? "Giriş yapılıyor…" : "Giriş Yap"}
          </button>
        </form>
      </div>
    </div>
  )
}
