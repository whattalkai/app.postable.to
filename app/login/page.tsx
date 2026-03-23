"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { setSession } from "@/lib/session"

const PASS = process.env.NEXT_PUBLIC_STUDIO_PASS ?? "studio2024"

export default function LoginPage() {
  const router = useRouter()
  const [value, setValue] = useState("")
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(false)

    if (value === PASS) {
      setSession()
      router.push("/")
    } else {
      setError(true)
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

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            type="password"
            placeholder="Parola"
            value={value}
            onChange={e => { setValue(e.target.value); setError(false) }}
            autoFocus
            style={{
              background: "#181818",
              border: error ? "1px solid #EF4444" : "1px solid #2a2a2a",
              borderRadius: 8,
              color: "#fff",
              fontSize: 15,
              padding: "12px 14px",
              outline: "none",
              transition: "border-color 0.15s",
            }}
          />
          {error && (
            <div style={{ color: "#EF4444", fontSize: 13 }}>Yanlış parola. Tekrar deneyin.</div>
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
