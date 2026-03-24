"use client"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { getSession, signOut } from "@/lib/session"
import { VoiceInputButton } from "@/components/VoiceInputButton"

// ── Types ──────────────────────────────────────────────────────────────────────
type Color = { name: string; hex: string; usage: string }
type Assistant = { name: string; role: string; desc: string }
type BrandData = {
  name: string; tagline: string; sector: string; market: string; tone: string
  primaryFont: string; logoDataUrl: string
  colors: Color[]; assistants: Assistant[]
  doList: string[]; dontList: string[]; keyMessages: string[]; hashtags: string[]
}
type Msg = { role: "ai" | "user"; text: string; time: string; images?: string[] }

// ── Defaults ───────────────────────────────────────────────────────────────────
const DEFAULT_BRAND: BrandData = {
  name: "", tagline: "", sector: "", market: "", tone: "", primaryFont: "Inter", logoDataUrl: "",
  colors: [
    { name: "Primary", hex: "#00C2A8", usage: "CTA, aksan, ikonlar" },
    { name: "Secondary", hex: "#7855FF", usage: "Gradyan, vurgular" },
    { name: "Background", hex: "#0A0A0A", usage: "Ana arkaplan" },
  ],
  assistants: [{ name: "Elif", role: "Randevu & Karşılama", desc: "7/24 aktif, sıcak ve güvenilir" }],
  doList: ["Gerçek sayı ve kanıt kullan", "Resmi 'siz' dili kullan"],
  dontList: ["'AI' yazma — 'Yapay Zeka' kullan", "Belirsiz iddia yapma"],
  keyMessages: [], hashtags: [],
}

const WELCOME: Msg = {
  role: "ai",
  text: "Merhaba! Ben Postable Brand Ajanınızım.\n\nMarkanızın DNA'sını birlikte oluşturacağız — kimlik, ses, renkler ve mesajlar.\n\nMarkanızın adı nedir?",
  time: "--:--",
}

const SECTIONS = [
  { id: "logo",       label: "Logo",               icon: "◎" },
  { id: "identity",   label: "Marka Kimliği",       icon: "◈" },
  { id: "colors",     label: "Renk Paleti",          icon: "◉" },
  { id: "typography", label: "Tipografi",             icon: "◫" },
  { id: "assistants", label: "YZ Asistanlar",         icon: "◎" },
  { id: "voice",      label: "Marka Sesi",            icon: "◈" },
  { id: "messages",   label: "Ana Mesajlar",          icon: "◫" },
  { id: "hashtags",   label: "Hashtag Şablonu",       icon: "◉" },
]

const GOOGLE_FONTS = [
  "Inter","Roboto","Open Sans","Lato","Montserrat","Raleway","Poppins",
  "Nunito","Playfair Display","Merriweather","DM Sans","Plus Jakarta Sans","Outfit","Sora",
]

function getTime() {
  if (typeof window === "undefined") return "--:--"
  const d = new Date()
  return d.getHours() + ":" + String(d.getMinutes()).padStart(2, "0")
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function BrandPage() {
  const router = useRouter()
  const [brand, setBrand] = useState<BrandData>(DEFAULT_BRAND)
  const [msgs, setMsgs] = useState<Msg[]>([WELCOME])
  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showList, setShowList] = useState(true)
  const [showChat, setShowChat] = useState(true)

  const [activeSection, setActiveSection] = useState("logo")
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const [attachedImages, setAttachedImages] = useState<string[]>([])
  const [isDragging, setIsDragging] = useState(false)

  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatFileInputRef = useRef<HTMLInputElement>(null)
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})

  useEffect(() => {
    getSession().then(s => { if (!s) { router.push("/login"); return } })
    try {
      const b = localStorage.getItem("wt_brand_data_v1")
      if (b) setBrand(JSON.parse(b))
      const c = localStorage.getItem("wt_brand_chat_v1")
      if (c) setMsgs(JSON.parse(c))
    } catch {}
  }, [router])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [msgs])

  // Auto-resize textarea when input changes (e.g. from voice transcription)
  useEffect(() => {
    const el = inputRef.current
    if (el) { el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 200) + "px" }
  }, [input])

  function persistBrand(data: BrandData) {
    setBrand(data)
    try { localStorage.setItem("wt_brand_data_v1", JSON.stringify(data)) } catch {}
  }

  function saveBrand() {
    persistBrand(brand)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function scrollToSection(id: string) {
    setActiveSection(id)
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  function applyBrandUpdates(text: string, current: BrandData): { clean: string; updated: BrandData } {
    let updated = { ...current }
    const regex = /\[BRAND_UPDATE\]([\s\S]*?)\[\/BRAND_UPDATE\]/g
    let match
    while ((match = regex.exec(text)) !== null) {
      try {
        const cmd = JSON.parse(match[1])
        if (cmd.field && cmd.value !== undefined) {
          (updated as Record<string, unknown>)[cmd.field] = cmd.value
        }
      } catch {}
    }
    const clean = text.replace(/\[BRAND_UPDATE\][\s\S]*?\[\/BRAND_UPDATE\]/g, "").trim()
    return { clean, updated }
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

  async function sendMessage() {
    const text = input.trim()
    if (!text && attachedImages.length === 0) return
    if (streaming) return
    const userMsg: Msg = { role: "user", text, time: getTime(), images: attachedImages.length > 0 ? [...attachedImages] : undefined }
    const history = [...msgs, userMsg]
    setMsgs(history)
    setInput("")
    setAttachedImages([])
    setStreaming(true)
    const aiPlaceholder: Msg = { role: "ai", text: "", time: getTime() }
    setMsgs([...history, aiPlaceholder])

    try {
      const res = await fetch("/api/brand-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.map(m => ({ role: m.role, text: m.text })), brandData: brand }),
      })
      if (!res.body) throw new Error("No stream")
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ""
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        fullText += decoder.decode(value, { stream: true })
        const display = fullText.replace(/\[BRAND_UPDATE\][\s\S]*?\[\/BRAND_UPDATE\]/g, "").trim()
        setMsgs(prev => { const n = [...prev]; n[n.length - 1] = { ...aiPlaceholder, text: display }; return n })
      }
      const { clean, updated } = applyBrandUpdates(fullText, brand)
      persistBrand(updated)
      setMsgs(prev => { const n = [...prev]; n[n.length - 1] = { ...aiPlaceholder, text: clean || fullText.trim() }; return n })
      try { localStorage.setItem("wt_brand_chat_v1", JSON.stringify([...history, { ...aiPlaceholder, text: clean || fullText.trim() }])) } catch {}
    } catch {
      setMsgs(prev => { const n = [...prev]; n[n.length - 1] = { role: "ai", text: "❌ Bağlantı hatası. Tekrar dene.", time: getTime() }; return n })
    } finally { setStreaming(false) }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const url = ev.target?.result as string
      persistBrand({ ...brand, logoDataUrl: url })
    }
    reader.readAsDataURL(file)
  }

  function updateColor(i: number, field: keyof Color, val: string) {
    setBrand(b => ({ ...b, colors: b.colors.map((c, idx) => idx === i ? { ...c, [field]: val } : c) }))
  }
  function updateAssistant(i: number, field: keyof Assistant, val: string) {
    setBrand(b => ({ ...b, assistants: b.assistants.map((a, idx) => idx === i ? { ...a, [field]: val } : a) }))
  }
  function updateList(field: keyof BrandData, i: number, val: string) {
    setBrand(b => ({ ...b, [field]: (b[field] as string[]).map((v, idx) => idx === i ? val : v) }))
  }
  function addToList(field: keyof BrandData, item: unknown) {
    setBrand(b => ({ ...b, [field]: [...(b[field] as unknown[]), item] }))
  }
  function removeFromList(field: keyof BrandData, i: number) {
    setBrand(b => ({ ...b, [field]: (b[field] as unknown[]).filter((_, idx) => idx !== i) }))
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#0c0c0c", color: "#e6e6e6", fontFamily: "'Inter', -apple-system, sans-serif", overflow: "hidden" }}>

      {/* ══ TOPBAR ══ */}
      <div style={{ height: 50, background: "#141414", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", padding: "0 12px 0 10px", gap: 6, flexShrink: 0, zIndex: 100 }}>

        {/* Logo */}
        <span style={{ fontSize: 16, fontWeight: 700, color: "#e6e6e6", letterSpacing: "-0.03em", margin: "0 4px" }}>Postable</span>

        {/* Sidebar toggle */}
        <button onClick={() => setShowList(v => !v)} title="Bölümler" style={{ ...S.panelBtn, color: showList ? "#fff" : "#6b6b6b" }}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.3"/><path d="M5.5 1v14" stroke="currentColor" strokeWidth="1.3"/></svg>
        </button>

        <div style={S.tbDiv}/>

        <span style={{ fontSize: 11, color: "#6b6b6b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 200 }}>
          {brand.name || "marka-adi"}
        </span>

        <div style={{ flex: 1 }}/>

        {/* Workspace tabs */}
        <div style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: 2, gap: 2 }}>
          <a href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", background: "transparent", color: "#6b6b6b", transition: "all 0.15s" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5"/><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/><polyline points="21 15 16 10 5 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            Studio
          </a>
          <a href="/brand" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", background: "rgba(120,85,255,0.12)", color: "#b8a1ff", transition: "all 0.15s" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Brand
          </a>
        </div>

        <div style={{ flex: 1 }}/>

        {/* Chat toggle */}
        <button onClick={() => setShowChat(v => !v)} title="Brand Agent" style={{ ...S.panelBtn, color: showChat ? "#fff" : "#6b6b6b" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>

        <div style={S.tbDiv}/>

        <button onClick={saveBrand} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "inherit", fontSize: 11, fontWeight: 600, padding: "5px 14px", borderRadius: 6, border: "none", cursor: "pointer", background: saved ? "#7855FF" : "#fff", color: "#0c0c0c", transition: "all 0.2s" }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><polyline points="17 21 17 13 7 13 7 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          {saved ? <span style={{ color: "#fff" }}>✓ Kaydedildi</span> : "Kaydet"}
        </button>

        <div style={S.tbDiv}/>

        <button
          onClick={async () => { await signOut(); router.push("/login") }}
          title="Çıkış yap"
          style={{ ...S.btnGhost, color: "#6b6b6b" }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><polyline points="16 17 21 12 16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          Çıkış
        </button>
      </div>

      {/* ══ MAIN ROW ══ */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>

        {/* ── COL 1: SECTIONS NAV ── */}
        <div style={{ width: showList ? 196 : 0, flexShrink: 0, background: "#1c1c1c", borderRight: showList ? "1px solid rgba(255,255,255,0.06)" : "none", display: "flex", flexDirection: "column", overflow: "hidden", transition: "width 0.22s ease" }}>
          <div style={{ padding: "10px 14px 8px", borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#6b6b6b", textTransform: "uppercase" as const, letterSpacing: "0.07em" }}>Bölümler</span>
          </div>
          <div style={{ flex: 1, overflowY: "auto" as const }}>
            {SECTIONS.map(sec => (
              <div key={sec.id} onClick={() => scrollToSection(sec.id)}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px 8px 14px", cursor: "pointer", borderLeft: `2px solid ${activeSection === sec.id ? "#7855FF" : "transparent"}`, background: activeSection === sec.id ? "rgba(120,85,255,0.06)" : "transparent", transition: "background 0.12s" }}>
                <span style={{ fontSize: 12, color: activeSection === sec.id ? "#7855FF" : "#3d3d3d" }}>{sec.icon}</span>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: activeSection === sec.id ? "#fff" : "#e6e6e6", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sec.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── COL 2: BRAND AGENT CHAT ── */}
        <div style={{ width: showChat ? 380 : 0, flexShrink: 0, background: "#111111", borderRight: showChat ? "1px solid rgba(255,255,255,0.06)" : "none", display: "flex", flexDirection: "column", overflow: "hidden", transition: "width 0.22s ease" }}>

          <div style={{ padding: "11px 14px 9px", borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0, display: "flex", alignItems: "center", gap: 7 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: streaming ? "#F59E0B" : "#7855FF", boxShadow: `0 0 0 2px ${streaming ? "rgba(245,158,11,0.15)" : "rgba(120,85,255,0.15)"}`, flexShrink: 0 }}/>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#e6e6e6" }}>Brand Ajan</div>
              <div style={{ fontSize: 9.5, color: "#6b6b6b" }}>Postable · Marka DNA Uzmanı</div>
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
                  {m.text ? m.text.split("\n").map((l, j) => <span key={j}>{l}<br/></span>) : (streaming && i === msgs.length - 1 ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      {[0, 0.2, 0.4].map((d, k) => (
                        <div key={k} style={{ width: 4, height: 4, borderRadius: "50%", background: "#6b6b6b", animation: `bounce 1.2s ${d}s infinite` }}/>
                      ))}
                    </div>
                  ) : "")}
                </div>
                <div style={{ fontSize: 9.5, color: "#3d3d3d", padding: "0 2px" }}>{m.time}</div>
              </div>
            ))}
            {streaming && msgs.length > 0 && msgs[msgs.length - 1].text && (
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
            <div style={{ display: "flex", flexDirection: "column", background: isDragging ? "rgba(120,85,255,0.04)" : "#2f2f2f", border: `1px solid ${isDragging ? "rgba(120,85,255,0.5)" : "rgba(255,255,255,0.08)"}`, borderRadius: 24, padding: "0", transition: "border-color 0.15s", overflow: "hidden" }}>
              {/* Attached image previews — inside the pill */}
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
                  placeholder={isDragging ? "Görseli bırak…" : "Markanız hakkında bir şey söyleyin…"}
                  rows={1}
                  disabled={streaming}
                  style={{ width: "100%", fontFamily: "inherit", fontSize: 15, color: "#ececec", background: "transparent", border: "none", outline: "none", resize: "none", minHeight: 24, maxHeight: 200, lineHeight: 1.6, padding: 0 }}
                />
              </div>
              {/* Bottom action row: + on left, mic & send on right */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 8px 8px" }}>
                {/* Left: attach button */}
                <button
                  onClick={() => chatFileInputRef.current?.click()}
                  title="Görsel ekle"
                  style={{ width: 32, height: 32, borderRadius: "50%", background: "transparent", border: "none", color: isDragging ? "#7855FF" : "#b4b4b4", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: 0, transition: "color 0.15s, background 0.15s" }}
                  onMouseEnter={e => { (e.target as HTMLElement).style.background = "rgba(255,255,255,0.08)" }}
                  onMouseLeave={e => { (e.target as HTMLElement).style.background = "transparent" }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                </button>
                {/* Right: mic + send */}
                <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <VoiceInputButton
                    onTranscript={(text) => setInput(prev => prev ? prev + " " + text : text)}
                    disabled={streaming}
                    onError={setVoiceError}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={streaming || (!input.trim() && attachedImages.length === 0)}
                    title="Gönder"
                    style={{ width: 32, height: 32, borderRadius: "50%", background: (streaming || (!input.trim() && attachedImages.length === 0)) ? "#676767" : "#fff", border: "none", cursor: (streaming || (!input.trim() && attachedImages.length === 0)) ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.15s" }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 19V5M12 5l-6 6M12 5l6 6" stroke={(streaming || (!input.trim() && attachedImages.length === 0)) ? "#929292" : "#0c0c0c"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                </div>
              </div>
            </div>
            <input
              ref={chatFileInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: "none" }}
              onChange={e => { Array.from(e.target.files || []).forEach(processImageFile); e.target.value = "" }}
            />
          </div>
        </div>

        {/* ── COL 3: BRAND BOARD ── */}
        <div style={{ flex: 1, background: "#0c0c0c", overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>

          {/* Logo */}
          <div ref={el => { sectionRefs.current["logo"] = el }}>
            <BoardSection title="Logo" icon="◎">
              <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                <div onClick={() => fileInputRef.current?.click()} style={{ width: 90, height: 90, borderRadius: 10, border: "2px dashed rgba(255,255,255,0.1)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", background: "#1a1a1a", flexShrink: 0, overflow: "hidden" }}>
                  {brand.logoDataUrl ? (
                    <img src={brand.logoDataUrl} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain", padding: 8 }}/>
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.25, marginBottom: 5 }}><rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5"/><circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="1.5"/><polyline points="21 15 16 10 5 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                      <span style={{ fontSize: 9.5, color: "#3d3d3d" }}>Yükle</span>
                    </>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: "none" }}/>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 11, color: "#6b6b6b", lineHeight: 1.6, marginBottom: 8 }}>SVG, PNG veya WebP yükleyin. Koyu arkaplan üzerinde görüntülenecek.</p>
                  {brand.logoDataUrl && (
                    <button onClick={() => persistBrand({ ...brand, logoDataUrl: "" })} style={S.btnSmall}>Kaldır</button>
                  )}
                </div>
              </div>
            </BoardSection>
          </div>

          {/* Brand Identity */}
          <div ref={el => { sectionRefs.current["identity"] = el }}>
            <BoardSection title="Marka Kimliği" icon="◈">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label="Marka Adı" value={brand.name} onChange={v => setBrand(b => ({ ...b, name: v }))} placeholder="Postable"/>
                <Field label="Tagline" value={brand.tagline} onChange={v => setBrand(b => ({ ...b, tagline: v }))} placeholder="Kısa ve güçlü bir slogan"/>
                <Field label="Sektör" value={brand.sector} onChange={v => setBrand(b => ({ ...b, sector: v }))} placeholder="Güzellik merkezleri…"/>
                <Field label="Pazar" value={brand.market} onChange={v => setBrand(b => ({ ...b, market: v }))} placeholder="Türkiye"/>
                <div style={{ gridColumn: "1/-1" }}>
                  <Field label="Ton" value={brand.tone} onChange={v => setBrand(b => ({ ...b, tone: v }))} placeholder="Modern · Güvenilir · Güçlendirici"/>
                </div>
              </div>
            </BoardSection>
          </div>

          {/* Colors */}
          <div ref={el => { sectionRefs.current["colors"] = el }}>
            <BoardSection title="Renk Paleti" icon="◉" action={<PillBtn onClick={() => addToList("colors", { name: "Yeni", hex: "#888888", usage: "" })}>+ Renk</PillBtn>}>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {brand.colors.map((c, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: "#1a1a1a", borderRadius: 8, padding: "8px 10px" }}>
                    <input type="color" value={c.hex} onChange={e => updateColor(i, "hex", e.target.value)} style={{ width: 30, height: 30, borderRadius: 6, border: "none", background: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}/>
                    <span style={{ fontSize: 11, fontFamily: "monospace", color: "#e6e6e6", width: 70, flexShrink: 0 }}>{c.hex}</span>
                    <input value={c.name} onChange={e => updateColor(i, "name", e.target.value)} style={{ ...S.pill, width: 80, flexShrink: 0 }} placeholder="İsim"/>
                    <input value={c.usage} onChange={e => updateColor(i, "usage", e.target.value)} style={{ ...S.pill, flex: 1 }} placeholder="Kullanım alanı"/>
                    <button onClick={() => removeFromList("colors", i)} style={S.iconBtn}><XIcon/></button>
                  </div>
                ))}
              </div>
            </BoardSection>
          </div>

          {/* Typography */}
          <div ref={el => { sectionRefs.current["typography"] = el }}>
            <BoardSection title="Tipografi" icon="◫">
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 9.5, fontWeight: 700, color: "#6b6b6b", textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 6 }}>Ana Font</div>
                  <select value={brand.primaryFont} onChange={e => setBrand(b => ({ ...b, primaryFont: e.target.value }))} style={{ width: "100%", background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 7, color: "#e6e6e6", fontSize: 13, fontWeight: 600, padding: "8px 10px", outline: "none", cursor: "pointer" }}>
                    {GOOGLE_FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div style={{ background: "#1a1a1a", borderRadius: 10, padding: "14px 22px", border: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
                  <div style={{ fontFamily: brand.primaryFont, fontSize: 28, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>Aa</div>
                  <div style={{ fontFamily: brand.primaryFont, fontSize: 10, color: "#6b6b6b", marginTop: 3 }}>{brand.primaryFont}</div>
                </div>
              </div>
            </BoardSection>
          </div>

          {/* Assistants */}
          <div ref={el => { sectionRefs.current["assistants"] = el }}>
            <BoardSection title="Yapay Zeka Asistanlar" icon="◎" action={<PillBtn onClick={() => addToList("assistants", { name: "", role: "", desc: "" })}>+ Asistan</PillBtn>}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {brand.assistants.map((a, i) => (
                  <div key={i} style={{ background: "#1a1a1a", borderRadius: 8, padding: "10px 12px", display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(120,85,255,0.1)", border: "1px solid rgba(120,85,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 13, fontWeight: 700, color: "#7855FF" }}>
                      {a.name?.[0] || "?"}
                    </div>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <input value={a.name} onChange={e => updateAssistant(i, "name", e.target.value)} style={{ ...S.pill, width: 90 }} placeholder="İsim"/>
                        <input value={a.role} onChange={e => updateAssistant(i, "role", e.target.value)} style={{ ...S.pill, flex: 1 }} placeholder="Rol"/>
                      </div>
                      <input value={a.desc} onChange={e => updateAssistant(i, "desc", e.target.value)} style={{ ...S.pill, width: "100%" }} placeholder="Açıklama"/>
                    </div>
                    <button onClick={() => removeFromList("assistants", i)} style={{ ...S.iconBtn, marginTop: 2 }}><XIcon/></button>
                  </div>
                ))}
              </div>
            </BoardSection>
          </div>

          {/* Brand Voice */}
          <div ref={el => { sectionRefs.current["voice"] = el }}>
            <BoardSection title="Marka Sesi" icon="◈">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <VoiceCol label="YAP ✓" color="#00C2A8" items={brand.doList}
                  onAdd={() => addToList("doList", "")}
                  onChange={(i, v) => updateList("doList", i, v)}
                  onRemove={i => removeFromList("doList", i)}/>
                <VoiceCol label="YAPMA ✗" color="#EF4444" items={brand.dontList}
                  onAdd={() => addToList("dontList", "")}
                  onChange={(i, v) => updateList("dontList", i, v)}
                  onRemove={i => removeFromList("dontList", i)}/>
              </div>
            </BoardSection>
          </div>

          {/* Key Messages */}
          <div ref={el => { sectionRefs.current["messages"] = el }}>
            <BoardSection title="Ana Kampanya Mesajları" icon="◫" action={<PillBtn onClick={() => addToList("keyMessages", "")}>+ Ekle</PillBtn>}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {brand.keyMessages.length === 0 && <p style={{ fontSize: 11, color: "#3d3d3d" }}>Brand Ajan sizi yönlendirecek.</p>}
                {brand.keyMessages.map((m, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 10, color: "#6b6b6b", fontWeight: 700, width: 16, textAlign: "right", flexShrink: 0 }}>{i + 1}</span>
                    <input value={m} onChange={e => updateList("keyMessages", i, e.target.value)} style={{ ...S.pill, flex: 1 }} placeholder="Ana mesaj…"/>
                    <button onClick={() => removeFromList("keyMessages", i)} style={S.iconBtn}><XIcon/></button>
                  </div>
                ))}
              </div>
            </BoardSection>
          </div>

          {/* Hashtags */}
          <div ref={el => { sectionRefs.current["hashtags"] = el }}>
            <BoardSection title="Hashtag Şablonu" icon="◉" action={<PillBtn onClick={() => addToList("hashtags", "")}>+ Ekle</PillBtn>}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {brand.hashtags.length === 0 && <p style={{ fontSize: 11, color: "#3d3d3d" }}>Henüz hashtag yok.</p>}
                {brand.hashtags.map((h, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "3px 10px" }}>
                    <input value={h} onChange={e => updateList("hashtags", i, e.target.value)} style={{ background: "transparent", border: "none", outline: "none", fontSize: 11, color: "#e6e6e6", width: Math.max(60, h.length * 7) }} placeholder="#hashtag"/>
                    <button onClick={() => removeFromList("hashtags", i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#3d3d3d", padding: 0, display: "flex" }}><XIcon size={9}/></button>
                  </div>
                ))}
              </div>
            </BoardSection>
          </div>

          <div style={{ height: 24 }}/>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: #222; border-radius: 3px; }
        textarea::placeholder { color: #8e8e8e; }
        input::placeholder { color: #3d3d3d; }
        select option { background: #1a1a1a; }
        @keyframes bounce { 0%,60%,100% { transform: translateY(0); } 30% { transform: translateY(-4px); } }
      `}</style>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function BoardSection({ title, icon, children, action }: { title: string; icon: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ padding: "11px 16px 9px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ fontSize: 12, color: "#6b6b6b" }}>{icon}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#e6e6e6" }}>{title}</span>
        </div>
        {action}
      </div>
      <div style={{ padding: "14px 16px" }}>{children}</div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <div style={{ fontSize: 9.5, fontWeight: 700, color: "#6b6b6b", textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 5 }}>{label}</div>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ width: "100%", background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 7, color: "#e6e6e6", fontSize: 12, padding: "7px 10px", outline: "none", fontFamily: "inherit" }}/>
    </div>
  )
}

function PillBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ fontSize: 10, fontWeight: 600, padding: "3px 9px", borderRadius: 5, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#6b6b6b", cursor: "pointer", fontFamily: "inherit" }}>
      {children}
    </button>
  )
}

function VoiceCol({ label, color, items, onAdd, onChange, onRemove }: {
  label: string; color: string; items: string[]
  onAdd: () => void; onChange: (i: number, v: string) => void; onRemove: (i: number) => void
}) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: "0.05em" }}>{label}</span>
        <PillBtn onClick={onAdd}>+ Ekle</PillBtn>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 4, height: 4, borderRadius: "50%", background: color, flexShrink: 0 }}/>
            <input value={item} onChange={e => onChange(i, e.target.value)} style={{ ...S.pill, flex: 1 }} placeholder="…"/>
            <button onClick={() => onRemove(i)} style={S.iconBtn}><XIcon/></button>
          </div>
        ))}
      </div>
    </div>
  )
}

function XIcon({ size = 11 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const S: Record<string, React.CSSProperties> = {
  panelBtn:  { width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, border: "none", background: "transparent", cursor: "pointer", transition: "all 0.15s", flexShrink: 0 },
  tbDiv:     { width: 1, height: 16, background: "rgba(255,255,255,0.07)", margin: "0 2px" },
  pill:      { background: "#111", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 6, color: "#e6e6e6", fontSize: 11.5, padding: "5px 9px", outline: "none", fontFamily: "inherit" },
  iconBtn:   { background: "none", border: "none", cursor: "pointer", color: "#3d3d3d", padding: 2, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 4 },
  btnSmall:  { display: "inline-flex", alignItems: "center", fontSize: 10.5, fontWeight: 600, padding: "4px 10px", borderRadius: 5, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#6b6b6b", cursor: "pointer", fontFamily: "inherit" },
}
