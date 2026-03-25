"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { TaskCard } from "./TaskCard"
import { VoiceInputButton } from "@/components/VoiceInputButton"
import { getSession } from "@/lib/session"
import { userKey, migrateIfNeeded } from "@/lib/userStorage"

type Task = { id: string; title: string; body: string; iterations: number }
type Column = { title: string; tasks: Task[]; color: string; dot: string }
type Msg = { role: "user" | "ai"; text: string; time: string; images?: string[] }

const WELCOME_MSG: Msg = {
  role: "ai",
  text: "Merhaba! Görev yönetim asistanınızım.\n\nBana görevlerle ilgili komutlar verebilirsiniz:\n• \"yeni görev ekle: …\"\n• \"#9'u done yap\"\n• \"görevleri listele\"\n• \"#14'e not ekle: …\"",
  time: "--:--",
}

function getTime() {
  if (typeof window === "undefined") return "--:--"
  const d = new Date()
  return d.getHours() + ":" + String(d.getMinutes()).padStart(2, "0")
}

export function TasksBoard({ columns }: { columns: Column[] }) {
  const router = useRouter()
  const [optimisticallyDone, setOptimisticallyDone] = useState<Set<string>>(new Set())
  const [msgs, setMsgs] = useState<Msg[]>([WELCOME_MSG])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [showChat, setShowChat] = useState(true)
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const [attachedImages, setAttachedImages] = useState<string[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Clear optimistic state when server data refreshes
  useEffect(() => {
    setOptimisticallyDone(new Set())
  }, [columns])

  const handleOptimisticDone = useCallback((taskKey: string) => {
    setOptimisticallyDone(prev => new Set([...prev, taskKey]))
  }, [])

  // Derive display columns: move optimistically-done tasks to Done immediately
  const taskKey = (t: Task) => t.id ? `${t.id} ${t.title}` : t.title
  const displayColumns = columns.map(col => {
    if (col.title === "In Review") {
      return { ...col, tasks: col.tasks.filter(t => !optimisticallyDone.has(taskKey(t))) }
    }
    if (col.title === "Done") {
      const movedTasks = (columns.find(c => c.title === "In Review")?.tasks ?? [])
        .filter(t => optimisticallyDone.has(taskKey(t)))
      return { ...col, tasks: [...movedTasks, ...col.tasks] }
    }
    return col
  })

  // Load chat history from localStorage (scoped by user email)
  useEffect(() => {
    getSession().then(s => {
      if (!s) return
      const email = s.user?.email ?? null
      setUserEmail(email)
      migrateIfNeeded("wt_tasks_chat_v1", email)
      try {
        const saved = localStorage.getItem(userKey("wt_tasks_chat_v1", email))
        if (saved) setMsgs(JSON.parse(saved))
      } catch {}
    })
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [msgs])

  // Auto-resize textarea
  useEffect(() => {
    const el = inputRef.current
    if (el) { el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 200) + "px" }
  }, [input])

  function persistChat(messages: Msg[]) {
    try { localStorage.setItem(userKey("wt_tasks_chat_v1", userEmail), JSON.stringify(messages)) } catch {}
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
    if (loading) return
    setInput("")
    setAttachedImages([])
    setLoading(true)

    const userMsg: Msg = { role: "user", text, time: getTime(), images: attachedImages.length > 0 ? [...attachedImages] : undefined }
    const updated = [...msgs, userMsg]
    setMsgs(updated)

    // Build history for the API (last 20 messages)
    const history = updated.slice(-20).map(m => ({
      role: m.role === "ai" ? "assistant" : "user",
      content: m.text,
    }))

    try {
      const res = await fetch("/api/tasks-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: history.slice(0, -1) }),
      })
      const data = await res.json()
      const aiMsg: Msg = {
        role: "ai",
        text: data.reply || data.error || "Bir hata oluştu.",
        time: getTime(),
      }
      const final = [...updated, aiMsg]
      setMsgs(final)
      persistChat(final)

      // If the agent modified TASKS.md, refresh the board
      if (data.modified) {
        router.refresh()
      }
    } catch {
      const errMsg: Msg = { role: "ai", text: "❌ Bağlantı hatası. Tekrar dene.", time: getTime() }
      const final = [...updated, errMsg]
      setMsgs(final)
      persistChat(final)
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  return (
    <div style={{ display: "flex", height: "100vh", background: "#0d0d0d", fontFamily: "'Inter', system-ui, sans-serif", overflow: "hidden" }}>

      {/* ── LEFT: CHAT PANEL ── */}
      <div style={{
        width: showChat ? 380 : 0,
        flexShrink: 0,
        background: "#111111",
        borderRight: showChat ? "1px solid rgba(255,255,255,0.06)" : "none",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        transition: "width 0.22s ease",
      }}>
        {/* Chat header */}
        <div style={{ padding: "11px 14px 9px", borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0, display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: loading ? "#F59E0B" : "#3ecf8e", boxShadow: `0 0 0 2px ${loading ? "rgba(245,158,11,0.15)" : "rgba(62,207,142,0.15)"}`, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#e6e6e6" }}>Görev Asistanı</div>
            <div style={{ fontSize: 9.5, color: "#6b6b6b" }}>Postable · Task Manager</div>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "12px 12px 6px", display: "flex", flexDirection: "column", gap: 10, scrollBehavior: "smooth" }}>
          {msgs.map((m, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 3, maxWidth: "90%", alignSelf: m.role === "user" ? "flex-end" : "flex-start", alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{
                padding: "8px 11px", borderRadius: 11, fontSize: 12, lineHeight: 1.55,
                background: m.role === "user" ? "#fff" : "#1c1c1c",
                color: m.role === "user" ? "#0c0c0c" : "#e6e6e6",
                borderBottomLeftRadius: m.role === "ai" ? 3 : 11,
                borderBottomRightRadius: m.role === "user" ? 3 : 11,
                wordBreak: "break-word", overflowWrap: "break-word",
              }}>
                {m.images && m.images.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: m.text ? 6 : 0 }}>
                    {m.images.map((src, idx) => (
                      <img key={idx} src={src} alt="" style={{ width: 68, height: 68, objectFit: "cover", borderRadius: 6, border: "1px solid rgba(0,0,0,0.12)", display: "block" }} />
                    ))}
                  </div>
                )}
                {m.text.split("\n").map((l, j) => <span key={j}>{l}<br /></span>)}
              </div>
              <div style={{ fontSize: 9.5, color: "#3d3d3d", padding: "0 2px" }}>{m.time}</div>
            </div>
          ))}
          {loading && (
            <div style={{ alignSelf: "flex-start" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "8px 12px", background: "#1c1c1c", borderRadius: 11, borderBottomLeftRadius: 3 }}>
                {[0, 0.2, 0.4].map((d, i) => (
                  <div key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: "#6b6b6b", animation: `bounce 1.2s ${d}s infinite` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input bar */}
        <div
          style={{ padding: "8px 10px 10px", flexShrink: 0 }}
          onDrop={handleDrop}
          onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
        >
          {voiceError && (
            <div style={{ marginBottom: 6, padding: "6px 10px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 20, fontSize: 11, color: "#f87171", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ flex: 1 }}>{voiceError}</span>
              <button onClick={() => setVoiceError(null)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", padding: 0, fontSize: 14, lineHeight: 1 }}>×</button>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", background: isDragging ? "rgba(62,207,142,0.04)" : "#2f2f2f", border: `1px solid ${isDragging ? "rgba(62,207,142,0.5)" : "rgba(255,255,255,0.08)"}`, borderRadius: 24, transition: "border-color 0.15s", overflow: "hidden" }}>
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
            <div style={{ padding: "12px 14px 0 14px" }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px" }}
                onKeyDown={handleKey}
                onPaste={handlePaste}
                placeholder={isDragging ? "Görseli bırak…" : "Görev komutu yazın…"}
                rows={1}
                disabled={loading}
                style={{ width: "100%", fontFamily: "inherit", fontSize: 15, color: "#ececec", background: "transparent", border: "none", outline: "none", resize: "none", minHeight: 24, maxHeight: 200, lineHeight: 1.6, padding: 0 }}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 8px 8px" }}>
              {/* Left: attach button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                title="Görsel ekle"
                style={{ width: 32, height: 32, borderRadius: "50%", background: "transparent", border: "none", color: isDragging ? "#3ecf8e" : "#b4b4b4", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: 0, transition: "color 0.15s, background 0.15s" }}
                onMouseEnter={e => { (e.target as HTMLElement).style.background = "rgba(255,255,255,0.08)" }}
                onMouseLeave={e => { (e.target as HTMLElement).style.background = "transparent" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
              {/* Right: mic + send */}
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
                  style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: (loading || (!input.trim() && attachedImages.length === 0)) ? "#676767" : "#fff",
                    border: "none",
                    cursor: (loading || (!input.trim() && attachedImages.length === 0)) ? "default" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, transition: "background 0.15s",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M12 19V5M12 5l-6 6M12 5l6 6" stroke={(loading || (!input.trim() && attachedImages.length === 0)) ? "#929292" : "#0c0c0c"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
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

      {/* ── RIGHT: TASK BOARD ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        {/* Header bar */}
        <div style={{ padding: "16px 24px 12px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <button
            onClick={() => setShowChat(v => !v)}
            title="Chat paneli"
            style={{
              width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
              borderRadius: 6, border: "none", background: "transparent", cursor: "pointer",
              color: showChat ? "#fff" : "#6b6b6b", transition: "all 0.15s", flexShrink: 0,
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div>
            <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 600, margin: 0, letterSpacing: "-0.02em" }}>Tasks</h1>
            <p style={{ color: "#555", fontSize: 13, margin: "2px 0 0" }}>
              {new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
        </div>

        {/* Board grid */}
        <div style={{ flex: 1, overflow: "auto", padding: "0 24px 24px" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(200px, 1fr))",
            gap: 12,
          }}>
            {displayColumns.map(col => (
              <div key={col.title} style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 200 }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 12px", background: "#161616", borderRadius: 8, border: "1px solid #222",
                }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: col.dot, flexShrink: 0,
                    boxShadow: col.dot !== "#555" && col.dot !== "#666" ? `0 0 6px ${col.dot}55` : "none",
                  }} />
                  <span style={{ color: "#ccc", fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>{col.title}</span>
                  <span style={{ marginLeft: "auto", background: "#222", color: "#666", borderRadius: 10, fontSize: 11, fontWeight: 600, padding: "1px 7px", minWidth: 18, textAlign: "center" }}>
                    {col.tasks.length}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {col.tasks.length === 0 ? (
                    <div style={{ padding: "20px 12px", borderRadius: 8, border: "1px dashed #222", color: "#333", fontSize: 12, textAlign: "center" }}>Empty</div>
                  ) : (
                    col.tasks.map((task, i) => (
                      <TaskCard key={i} task={task} colTitle={col.title} dotColor={col.dot} onOptimisticDone={handleOptimisticDone} />
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce { 0%,60%,100% { transform: translateY(0); } 30% { transform: translateY(-4px); } }
        textarea::placeholder { color: #8e8e8e; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: #222; border-radius: 3px; }
      `}</style>
    </div>
  )
}
