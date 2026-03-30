"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { brandDataToGuide } from "@/lib/brandDataToGuide"
import { getSession, signOut } from "@/lib/session"
import { VoiceInputButton } from "@/components/VoiceInputButton"

type WebDesign = {
  id: string
  title: string
  html: string
  date: string
  slug: string
}

type Msg = { role: "ai" | "user"; text: string; time: string; images?: string[] }
type ChatHistory = Record<string, Msg[]>

const WELCOME_MSG: Msg = {
  role: "ai",
  text: "Merhaba! Websitesi tasarlamaya hazırım.\n\n• \"Güzellik merkezi için landing page yap\"\n• \"SaaS ürün tanıtım sitesi tasarla\"\n• \"Portfolio websitesi oluştur\"",
  time: "--:--"
}

function getTime() {
  if (typeof window === "undefined") return "--:--"
  const d = new Date()
  return d.getHours() + ":" + String(d.getMinutes()).padStart(2, "0")
}

export default function WebpagePage() {
  const router = useRouter()
  const [designs, setDesigns] = useState<WebDesign[]>([])
  const [active, setActive] = useState<WebDesign | null>(null)
  const [chatHistory, setChatHistory] = useState<ChatHistory>({})
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [typing, setTyping] = useState(false)
  const [newCount, setNewCount] = useState(0)
  const [attachedImages, setAttachedImages] = useState<string[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [voiceError, setVoiceError] = useState<string | null>(null)

  // Panel visibility
  const [showList, setShowList] = useState(true)
  const [showChat, setShowChat] = useState(true)

  // Brand guide
  const [brandGuide, setBrandGuide] = useState("")

  // Derived: per-design chat messages
  const msgs: Msg[] = active ? (chatHistory[active.id] ?? [WELCOME_MSG]) : [WELCOME_MSG]

  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const el = inputRef.current
    if (el) { el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 200) + "px" }
  }, [input])
  const wrapRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleLogout() {
    await signOut()
    router.push("/login")
  }

  // Load from localStorage
  useEffect(() => {
    getSession().then(s => { if (!s) router.push("/login") })
    try {
      const s = localStorage.getItem("wt_webdesigns_v1")
      const existing: WebDesign[] = s ? JSON.parse(s) : []
      setDesigns(existing)
      if (existing.length > 0) { setActive(existing[0]) }

      // Load brand data and derive guide
      const bd = localStorage.getItem("wt_brand_data_v1")
      if (bd) setBrandGuide(brandDataToGuide(JSON.parse(bd)))

      // Load per-design chat history
      const ch = localStorage.getItem("wt_webchat_v1")
      if (ch) setChatHistory(JSON.parse(ch))
    } catch {}
  }, [])

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }) }, [msgs, typing])

  // Sync brand guide when Brand page saves data
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === "wt_brand_data_v1" && e.newValue) {
        try { setBrandGuide(brandDataToGuide(JSON.parse(e.newValue))) } catch {}
      }
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  // Scale iframe to fill wrap — website is 1440px wide
  const scaleIframe = useCallback(() => {
    const wrap = wrapRef.current
    const fr = iframeRef.current
    if (!wrap || !fr) return
    const r = wrap.getBoundingClientRect()
    const scale = r.width / 1440
    fr.style.transform = `scale(${scale})`
    fr.style.height = `${r.height / scale}px`
  }, [])

  useEffect(() => {
    scaleIframe()
    window.addEventListener("resize", scaleIframe)
    return () => window.removeEventListener("resize", scaleIframe)
  }, [scaleIframe, showList, showChat])

  useEffect(() => { setTimeout(scaleIframe, 250) }, [showList, showChat, scaleIframe])

  function persist(list: WebDesign[]) {
    setDesigns(list)
    localStorage.setItem("wt_webdesigns_v1", JSON.stringify(list))
  }

  function addAiMsg(designId: string, text: string) {
    setChatHistory(prev => {
      const existing = prev[designId] ?? []
      const updated = { ...prev, [designId]: [...existing, { role: "ai" as const, text, time: getTime() }] }
      try { localStorage.setItem("wt_webchat_v1", JSON.stringify(updated)) } catch {}
      return updated
    })
  }

  function addUserMsg(designId: string, text: string, images?: string[]) {
    setChatHistory(prev => {
      const existing = prev[designId] ?? []
      const updated = { ...prev, [designId]: [...existing, { role: "user" as const, text, time: getTime(), images }] }
      try { localStorage.setItem("wt_webchat_v1", JSON.stringify(updated)) } catch {}
      return updated
    })
  }

  function selectDesign(d: WebDesign) {
    setActive(d)
  }

  function newDesign() {
    const n = newCount + 1
    setNewCount(n)
    const d: WebDesign = {
      id: Date.now().toString(), title: `Yeni Website ${n}`,
      html: "", date: "Bugün", slug: `yeni-website-${n}`
    }
    const updated = [d, ...designs]
    persist(updated)
    setActive(d)
    setTimeout(() => {
      addAiMsg(d.id, "Yeni websitesi projesi oluşturuldu. Ne tür bir site tasarlayalım?\n\n• \"Güzellik merkezi için modern landing page\"\n• \"Teknoloji startup tanıtım sitesi\"\n• \"Restoran websitesi menü ile\"")
      inputRef.current?.focus()
    }, 50)
  }

  async function generate(topic: string, designId: string, images?: string[]) {
    setLoading(true)
    setTyping(true)
    try {
      const res = await fetch("/api/webpage-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, brandGuide, images })
      })
      const data = await res.json()
      setTyping(false)
      if (!res.ok || !data.html) { addAiMsg(designId, `❌ Hata: ${data.error || "Bilinmeyen hata"}`); return }
      const d: WebDesign = {
        id: Date.now().toString(),
        title: topic.length > 30 ? topic.slice(0, 30) + "…" : topic,
        html: data.html,
        date: new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "short" }),
        slug: topic.slice(0, 20).toLowerCase().replace(/\s+/g, "-")
      }
      const updated = designs.some(x => x.id === designId)
        ? designs.map(x => x.id === designId ? { ...d, id: designId } : x)
        : [d, ...designs]
      persist(updated)
      const finalDesign = { ...d, id: designId }
      setActive(finalDesign)
      addAiMsg(designId, `✅ "${d.title}" websitesi tasarlandı! Önizlemeyi sağda görebilirsin.\n\nDeğişiklik istersen yaz, örneğin:\n• "hero bölümünü değiştir"\n• "pricing section ekle"\n• "renkleri mora çevir"\n• "testimonials bölümü ekle"`)
    } catch {
      setTyping(false)
      addAiMsg(designId, "❌ Bağlantı hatası. Tekrar dene.")
    } finally { setLoading(false) }
  }

  async function editDesign(instruction: string, designId: string, images?: string[]) {
    if (!active) return
    setLoading(true)
    setTyping(true)
    try {
      const res = await fetch("/api/webpage-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction, existingHtml: active.html, brandGuide, images })
      })
      const data = await res.json()
      setTyping(false)
      if (!res.ok || !data.html) { addAiMsg(designId, `❌ Hata: ${data.error || "Bilinmeyen hata"}`); return }

      // Client-side safeguard
      if (active.html && data.html.length < active.html.length * 0.3) {
        addAiMsg(designId, "⚠️ Yapay zeka beklenenden çok farklı bir sonuç döndürdü. Tasarımın korundu — lütfen tekrar dene.")
        return
      }

      const updated = designs.map(d =>
        d.id === active.id ? { ...d, html: data.html } : d
      )
      persist(updated)
      const next = updated.find(d => d.id === active.id)!
      setActive(next)
      addAiMsg(designId, data.message ? `✅ ${data.message}` : "✅ Değişiklik uygulandı! Başka bir düzenleme ister misiniz?")
    } catch {
      setTyping(false)
      addAiMsg(designId, "❌ Bağlantı hatası. Tekrar dene.")
    } finally {
      setLoading(false)
    }
  }

  function sendMessage() {
    const text = input.trim()
    if (!text && attachedImages.length === 0) return
    if (!active) return
    const designId = active.id
    const images = attachedImages.length > 0 ? [...attachedImages] : undefined
    addUserMsg(designId, text, images)
    setInput("")
    setAttachedImages([])

    // Move active design to top
    const idx = designs.findIndex(d => d.id === designId)
    if (idx > 0) {
      const reordered = [designs[idx], ...designs.slice(0, idx), ...designs.slice(idx + 1)]
      persist(reordered)
    }

    const isEmptySlot = !active.html

    const wantsNew = text.toLowerCase().startsWith("yeni website")
      || text.toLowerCase().includes("yeni website")
      || text.toLowerCase().includes("baştan yap")
      || text.toLowerCase().includes("sıfırdan yap")

    if (isEmptySlot || wantsNew) {
      generate(text, designId, images)
    } else {
      editDesign(text, designId, images)
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  function processImageFile(file: File) {
    if (!file.type.startsWith("image/")) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const original = e.target?.result as string
      const img = new Image()
      img.onload = () => {
        const MAX = 1200
        let { width, height } = img
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round(height * MAX / width); width = MAX }
          else { width = Math.round(width * MAX / height); height = MAX }
        }
        const canvas = document.createElement("canvas")
        canvas.width = width; canvas.height = height
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height)
        setAttachedImages(prev => [...prev, canvas.toDataURL("image/jpeg", 0.85)])
      }
      img.src = original
    }
    reader.readAsDataURL(file)
  }

  function handlePaste(e: React.ClipboardEvent) {
    const items = Array.from(e.clipboardData.items)
    items.filter(i => i.type.startsWith("image/")).forEach(i => {
      const f = i.getAsFile()
      if (f) processImageFile(f)
    })
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    Array.from(e.dataTransfer.files).forEach(processImageFile)
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#0c0c0c", color: "#e6e6e6", fontFamily: "'Inter', -apple-system, sans-serif", overflow: "hidden" }}>

      {/* ══ TOPBAR ══ */}
      <div style={{ height: 50, background: "#141414", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", padding: "0 12px 0 10px", gap: 6, flexShrink: 0, zIndex: 100 }}>

        <span style={{ fontSize: 16, fontWeight: 700, color: "#e6e6e6", letterSpacing: "-0.03em", margin: "0 4px" }}>Postable</span>

        <button onClick={() => setShowList(v => !v)} title="Tasarım listesi" style={{ ...S.panelBtn, color: showList ? "#fff" : "#6b6b6b" }}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.3"/><path d="M5.5 1v14" stroke="currentColor" strokeWidth="1.3"/></svg>
        </button>

        <div style={S.tbDiv}/>
        <span style={{ fontSize: 11, color: "#6b6b6b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 200 }}>
          {active ? active.slug || active.title.toLowerCase().replace(/\s+/g, "-") : "yeni-website"}
        </span>

        <div style={{ flex: 1 }}/>

        {/* Workspace tabs */}
        <div style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: 2, gap: 2 }}>
          <a href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", background: "transparent", color: "#6b6b6b", transition: "all 0.15s" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5"/><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/><polyline points="21 15 16 10 5 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            Studio
          </a>
          <a href="/brand" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", background: "transparent", color: "#6b6b6b", transition: "all 0.15s" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Brand
          </a>
          <a href="/webpage" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", background: "rgba(255,255,255,0.1)", color: "#fff", transition: "all 0.15s" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="2" y="3" width="20" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/><line x1="2" y1="8" x2="22" y2="8" stroke="currentColor" strokeWidth="1.5"/><circle cx="5.5" cy="5.5" r="1" fill="currentColor"/><circle cx="8.5" cy="5.5" r="1" fill="currentColor"/><circle cx="11.5" cy="5.5" r="1" fill="currentColor"/></svg>
            Webpage
          </a>
        </div>

        <div style={{ flex: 1 }}/>

        <div style={S.tbDiv}/>

        <button
          onClick={handleLogout}
          title="Çıkış yap"
          style={{ ...S.btnGhost, color: "#6b6b6b" }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><polyline points="16 17 21 12 16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          Çıkış
        </button>
      </div>

      {/* ══ MAIN ROW ══ */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>

        {/* ── COL 1: WEBSITE LIST ── */}
        <div style={{ width: showList ? 196 : 0, flexShrink: 0, background: "#1c1c1c", borderRight: showList ? "1px solid rgba(255,255,255,0.06)" : "none", display: "flex", flexDirection: "column", overflow: "hidden", transition: "width 0.22s ease" }}>
          <div style={{ padding: "10px 14px 8px", borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#6b6b6b", textTransform: "uppercase" as const, letterSpacing: "0.07em" }}>Tasarımlar</span>
            <button onClick={newDesign} style={{ width: 22, height: 22, borderRadius: 5, border: "none", background: "transparent", color: "#6b6b6b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
          </div>
          <div style={{ flex: 1, overflowY: "auto" as const }}>
            {designs.length === 0 && (
              <p style={{ fontSize: 10.5, color: "#3d3d3d", padding: "12px 14px", lineHeight: 1.6 }}>Henüz tasarım yok. Sağdaki sohbetten başla.</p>
            )}
            {designs.map(d => (
              <div key={d.id} onClick={() => selectDesign(d)}
                style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 12px 8px 14px", cursor: "pointer", borderLeft: `2px solid ${active?.id === d.id ? "#fff" : "transparent"}`, background: active?.id === d.id ? "rgba(255,255,255,0.05)" : "transparent", transition: "background 0.12s" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: active?.id === d.id ? "#fff" : "#e6e6e6", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.35 }}>{d.title}</div>
                  <div style={{ fontSize: 10, color: "#6b6b6b", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3, textTransform: "uppercase" as const, letterSpacing: "0.04em", background: "rgba(255,255,255,0.07)", color: "#6b6b6b" }}>WEB</span>
                    {d.date}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── COL 2: CHAT PANEL ── */}
        <div style={{ width: showChat ? 380 : 0, flexShrink: 0, background: "#111111", borderRight: showChat ? "1px solid rgba(255,255,255,0.06)" : "none", display: "flex", flexDirection: "column", overflow: "hidden", transition: "width 0.22s ease" }}>

          <div style={{ padding: "11px 14px 9px", borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0, display: "flex", alignItems: "center", gap: 7 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: loading ? "#F59E0B" : "#fff", boxShadow: `0 0 0 2px ${loading ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.08)"}`, flexShrink: 0 }}/>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#e6e6e6" }}>Yapay Zeka Asistan</div>
              <div style={{ fontSize: 9.5, color: "#6b6b6b" }}>WhatTalk.ai · Website Stüdyosu</div>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto" as const, overflowX: "hidden" as const, padding: "12px 12px 6px", display: "flex", flexDirection: "column", gap: 10, scrollBehavior: "smooth" }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: 3, maxWidth: "90%", alignSelf: m.role === "user" ? "flex-end" : "flex-start", alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{ padding: "8px 11px", borderRadius: 11, fontSize: 12, lineHeight: 1.55, background: m.role === "user" ? "#fff" : "#1c1c1c", color: m.role === "user" ? "#0c0c0c" : "#e6e6e6", borderBottomLeftRadius: m.role === "ai" ? 3 : 11, borderBottomRightRadius: m.role === "user" ? 3 : 11, wordBreak: "break-word" as const, overflowWrap: "break-word" as const }}>
                  {m.images && m.images.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: m.text ? 6 : 0 }}>
                      {m.images.map((src, idx) => (
                        <img key={idx} src={src} alt="" style={{ width: 68, height: 68, objectFit: "cover", borderRadius: 6, border: "1px solid rgba(0,0,0,0.12)", display: "block" }} />
                      ))}
                    </div>
                  )}
                  {m.text && m.text.split("\n").map((l, j) => <span key={j}>{l}<br/></span>)}
                </div>
                <div style={{ fontSize: 9.5, color: "#3d3d3d", padding: "0 2px" }}>{m.time}</div>
              </div>
            ))}
            {typing && (
              <div style={{ alignSelf: "flex-start" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "8px 12px", background: "#1c1c1c", borderRadius: 11, borderBottomLeftRadius: 3 }}>
                  {[0, 0.2, 0.4].map((d, i) => (
                    <div key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: "#6b6b6b", animation: `bounce 1.2s ${d}s infinite` }}/>
                  ))}
                </div>
              </div>
            )}
            <div ref={chatEndRef}/>
          </div>

          <div
            style={{ padding: "8px 10px 10px", flexShrink: 0 }}
            onDrop={handleDrop}
            onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
          >
            {/* Voice error toast */}
            {voiceError && (
              <div style={{ marginBottom: 6, padding: "6px 10px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 20, fontSize: 11, color: "#f87171", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ flex: 1 }}>{voiceError}</span>
                <button onClick={() => setVoiceError(null)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", padding: 0, fontSize: 14, lineHeight: 1 }}>×</button>
              </div>
            )}
            {/* ChatGPT-style pill input bar */}
            <div style={{ display: "flex", flexDirection: "column", background: isDragging ? "rgba(59,130,246,0.04)" : "#2f2f2f", border: `1px solid ${isDragging ? "rgba(59,130,246,0.5)" : "rgba(255,255,255,0.08)"}`, borderRadius: 24, padding: "0", transition: "border-color 0.15s", overflow: "hidden" }}>
              {/* Attached image previews */}
              {attachedImages.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "10px 14px 0" }}>
                  {attachedImages.map((src, idx) => (
                    <div key={idx} style={{ position: "relative", width: 54, height: 54, flexShrink: 0 }}>
                      <img src={src} alt="" style={{ width: 54, height: 54, objectFit: "cover", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", display: "block" }} />
                      <button
                        onClick={() => setAttachedImages(prev => prev.filter((_, i) => i !== idx))}
                        style={{ position: "absolute", top: -5, right: -5, width: 16, height: 16, borderRadius: "50%", background: "#333", border: "1px solid rgba(255,255,255,0.15)", color: "#ccc", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, lineHeight: 1, padding: 0 }}
                      >×</button>
                    </div>
                  ))}
                </div>
              )}
              {/* Textarea row */}
              <div style={{ padding: "12px 14px 0 14px" }}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px" }}
                  onKeyDown={handleKey}
                  onPaste={handlePaste}
                  placeholder={isDragging ? "Görseli bırak…" : "Mesaj yazın"}
                  rows={1}
                  disabled={loading}
                  style={{ width: "100%", fontFamily: "inherit", fontSize: 15, color: "#ececec", background: "transparent", border: "none", outline: "none", resize: "none", minHeight: 24, maxHeight: 200, lineHeight: 1.6, padding: 0 }}
                />
              </div>
              {/* Bottom action row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 8px 8px" }}>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  title="Görsel ekle"
                  style={{ width: 32, height: 32, borderRadius: "50%", background: "transparent", border: "none", color: isDragging ? "#3B82F6" : "#b4b4b4", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: 0, transition: "color 0.15s, background 0.15s" }}
                  onMouseEnter={e => { (e.target as HTMLElement).style.background = "rgba(255,255,255,0.08)" }}
                  onMouseLeave={e => { (e.target as HTMLElement).style.background = "transparent" }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                </button>
                <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <VoiceInputButton
                    onTranscript={(text) => setInput(prev => prev ? prev + " " + text : text)}
                    disabled={loading}
                    onError={setVoiceError}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={loading || (!input.trim() && attachedImages.length === 0)}
                    title="Gönder"
                    style={{ width: 32, height: 32, borderRadius: "50%", background: (loading || (!input.trim() && attachedImages.length === 0)) ? "#676767" : "#fff", border: "none", cursor: (loading || (!input.trim() && attachedImages.length === 0)) ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.15s" }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 19V5M12 5l-6 6M12 5l6 6" stroke={(loading || (!input.trim() && attachedImages.length === 0)) ? "#929292" : "#0c0c0c"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                </div>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: "none" }}
              onChange={e => { Array.from(e.target.files || []).forEach(processImageFile); e.target.value = "" }}
            />
          </div>
        </div>

        {/* ── COL 3: WEBSITE PREVIEW ── */}
        <div style={{ flex: 1, background: "#0c0c0c", display: "flex", alignItems: "stretch", justifyContent: "center", overflow: "hidden", position: "relative", minWidth: 0 }}>
          {!active || !active.html ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 36, opacity: 0.08, marginBottom: 10 }}>🌐</div>
                <p style={{ fontSize: 12, color: "#3d3d3d" }}>Sol panelden konu gir veya mevcut tasarımı seç</p>
              </div>
            </div>
          ) : (
            <div ref={wrapRef} style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden" }}>
              <iframe
                ref={iframeRef}
                srcDoc={active.html}
                sandbox="allow-scripts allow-same-origin"
                onLoad={scaleIframe}
                style={{ position: "absolute", top: 0, left: 0, width: 1440, border: "none", transformOrigin: "top left", display: "block" }}
              />
            </div>
          )}
          {loading && (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(12,12,12,0.8)", backdropFilter: "blur(4px)" }}>
              <div style={{ width: 32, height: 32, border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.75s linear infinite" }}/>
              <p style={{ fontSize: 12, color: "#6b6b6b", marginTop: 12 }}>Website tasarlanıyor…</p>
            </div>
          )}
        </div>

      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: #222; border-radius: 3px; }
        textarea::placeholder { color: #8e8e8e; }
        @keyframes bounce { 0%,60%,100% { transform: translateY(0); } 30% { transform: translateY(-4px); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

const S: Record<string, React.CSSProperties> = {
  panelBtn: { width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, border: "none", background: "transparent", cursor: "pointer", transition: "all 0.15s", flexShrink: 0 },
  tbDiv: { width: 1, height: 16, background: "rgba(255,255,255,0.07)", margin: "0 2px" },
  btnGhost: { display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, padding: "5px 11px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.07)", cursor: "pointer", background: "transparent", color: "#6b6b6b", whiteSpace: "nowrap" } as React.CSSProperties,
}
