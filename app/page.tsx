"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { brandDataToGuide } from "@/lib/brandDataToGuide"
import { getSession, clearSession } from "@/lib/session"
import { VoiceInputButton } from "@/components/VoiceInputButton"

type Design = {
  id: string
  title: string
  type: "story" | "post" | "reel" | "new"
  html: string
  src?: string
  caption: string
  hashtags: string[]
  date: string
  slug: string
}

type Msg = { role: "ai" | "user"; text: string; time: string; images?: string[] }
type ChatHistory = Record<string, Msg[]>

const WELCOME_MSG: Msg = {
  role: "ai",
  text: "Merhaba! Soldan bir tasarım seç veya buraya yaz.\n\n• \"yeni story tasarla\"\n• \"caption'ı güncelle\"\n• \"Zeynep için post yap\"",
  time: "--:--"
}

function getTime() {
  if (typeof window === "undefined") return "--:--"
  const d = new Date()
  return d.getHours() + ":" + String(d.getMinutes()).padStart(2, "0")
}

const DEFAULT_BRAND_GUIDE = `# WhatTalk.ai — Marka Rehberi (v1.0 · Mart 2026)

## 1. Marka Kimliği
- **Marka adı:** WhatTalk.ai
- **Tagline:** "Güzellik merkezleri yapay zekayı cilde taşıdı. Biz telefona getirdik."
- **Sektör:** Güzellik merkezleri, klinikler, randevu tabanlı KOBİ'ler
- **Pazar:** Türkiye
- **Ton:** Modern · Güvenilir · Güçlendirici · Arkadaşça Profesyonel
- **Dil:** Türkçe · Resmi "siz" dili · Argo yok · **"AI" yasak → her zaman "Yapay Zeka"**

## 2. Yapay Zeka Asistanlar
- **Elif** — Ana randevu ve müşteri karşılama asistanı. Sıcak, güvenilir, 7/24 aktif.
- **Zeynep** — Müşteri takip ve geri kazanım uzmanı.
- **Deniz** — Satış, referans ve büyüme asistanı.
> Asistanlardan "yapay zeka asistan" olarak bahset, asla "AI agent" deme.

## 3. Renk Paleti
| İsim | Hex | Kullanım |
|------|-----|----------|
| Near Black | #0A0A0A | Ana arkaplan (hero, koyu bölümler) |
| WhatTalk Teal | #00C2A8 | Birincil aksan — CTA, başarı durumu, ikonlar |
| Brand Purple | #7855FF | İkincil aksan — hero gradyan, dalga deseni, vurgular |
| Pure White | #FFFFFF | Koyu üzeri yazı, kart arkaplanı |
| Light Gray | #F5F5F5 | Bölüm arkaplanı |
| Alert Red | #EF4444 | "Öncesi" senaryoları, problem göstergeleri |

**CSS değişkenleri:**
--black: #0A0A0A; --teal: #00C2A8; --purple: #7855FF; --white: #FFFFFF; --red: #EF4444

## 4. Tipografi
- **Font:** Sadece Inter (300–900 tüm ağırlıklar) — başka font KESİNLİKLE YASAK
- @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap')
- Hero başlık: 76–88px / weight 800–900 / letter-spacing -0.03em
- Alt başlık: 56–64px / weight 700
- KPI sayı: 64–80px / weight 800
- Gövde: 36–40px / weight 400 / line-height 1.5
- Badge/label: 28–36px / BÜYÜK HARF / letter-spacing +0.07em
- **Minimum boyut: 36px** (1080px canvas'ta 36px altı ekranda okunamaz)

## 5. Logo Kuralları
- Konum: **Her zaman alt orta** — asla üst, asla yan
- CSS: position:absolute; bottom:64px; left:50%; transform:translateX(-50%); opacity:0.85
- Boyut: width:200px; height:auto
- Koyu arkaplan → logo-white.svg (beyaz logo)
- Açık arkaplan → logo-dark.svg (koyu logo)
- Logoya gölge, döndürme, yeniden renklendirme yapma

## 6. Görsel Stil
- **Koyu bölümler:** #0A0A0A arkaplan + noise texture (%3–4 opaklık) + teal/mor ambient blob ışıkları
- **Açık bölümler:** #FFFFFF veya #F5F5F5 + teal aksanlar
- Önce/Sonra karşılaştırma: Sol = kırmızı (problem) · Sağ = teal (çözüm)

## 7. Animasyon Standardı
- Arkaplan: anında görünür — animasyon YOK
- Elementler: yukarıdan aşağıya, sırayla açılır
- Efekt: fadeIn + slideUp (20px yukarı kayarak belirir), 0.5s ease-out
- Stagger: 0.8s gecikme arası
- YASAK: zıplama, scale, döndürme, renk flaşı, blur geçişi
- @keyframes revealUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }

## 8. Canvas Özellikleri (9:16)
- Boyut: 1080 × 1920px
- Instagram güvenli alan: ortada 1080×1350px (üst 285px + alt 285px grid'de kırpılır)
- Tüm kritik içerik (logo, başlık, istatistik, CTA) güvenli alanda olmalı
- html: width:1080px; min-height:1920px; overflow-y:auto
- body: width:1080px; height:1920px; overflow:hidden; position:relative; margin:0

## 9. Marka Sesi — Yap / Yapma
| YAP | YAPMA |
|-----|-------|
| Gerçek sayı ve kanıt kullan | Belirsiz iddia yap |
| Retorik soru sor | Pasif cümle kur |
| Acıyı göster, sonra çözümü sun | Özelliklerle başla |
| Asistan adını söyle (Elif, Zeynep, Deniz) | "AI'mız" de |
| İnsan sıcaklığı + teknik güven | Robotik ve kurumsal ses |
| Resmi "siz" kullan | "Sen" veya argo kullan |

**Örnek ton:**
> "137 müşteri, ortalama 3.2 arkadaşını tavsiye etti — 445 yeni isim, hepsi kayıt altında."
> "Elif, sizin için çalışmaya hazır. Siz uyurken bile."

## 10. Hedef Kitle
- Güzellik merkezi sahipleri ve yöneticileri
- Estetik klinik sahipleri
- Diş kliniği, fizyoterapi, SPA — randevu tabanlı tüm işletmeler

## 11. Ana Kampanya Mesajları
- Kaçırılan çağrı = kaybedilen gelir
- Yapay Zeka resepsiyonist 7/24 çalışır, yorulmaz
- Referans sistemiyle mevcut müşteriden yeni müşteri kazan
- Kaos vs. WhatTalk: öncesi/sonrası karşılaştırması
- Fiyat / değer önerisi

## 12. Hashtag Şablonu
#WhatTalkAI #YapayZekaAsistan #GuzellikMerkezi #ElifAgent
#YapayZekaRekordu #MusteriDeneyimi #ReferansKampanyasi
#OtomatikReferans #RandevuSistemi #GuzellikTeknolojisi

## 13. Yasak İçerik
- "Retell" veya "GHL" adlarını asla yazma
- Dahili teknoloji yığınını müşteri içeriğinde asla açıklama
- "AI" kısaltması — her zaman "Yapay Zeka" yaz`

const REGEN = [
  `Rakibiniz şu an ne yapıyor? 🤔\n\nMuhtemelen müşteri takibini unutuyor.\nReferansları kaçırıyor.\n\nSiz Elif'i çalıştırıyorsunuz.\n\nFark bu kadar basit. ✅\n\nwhattalk.ai`,
  `Güzellik merkezlerinde en büyük gelir kaynağı:\n\n→ Mevcut memnun müşterinin referansı\n\nBu kaynağı sistematik kullanıyor musunuz?\n\nElif her gün bunun için çalışıyor. 💪\n\nwhattalk.ai ile tanışın 👇`,
  `"Müşteri memnundu ama bir daha gelmiyor…"\n\nBu cümleyi kaç kez duydunuz? 😔\n\nElif bu durumu değiştiriyor:\n• Takip ediyor · Hatırlatıyor · Referans alıyor\n\nOtomatik. Sistematik. Kesintisiz.\n\nwhattalk.ai 🤖`
]

const STATIC_DESIGNS: Design[] = [
  {
    id: "static-1", title: "Madelyn Marcel Kampanya Sonuçları",
    type: "story", src: "/designs/post-madelyn-marcel-referans-2026-03-19.html", html: "",
    caption: "Madelyn Marcel güzellik merkezi Elif ile ilk kampanyasında 137 müşteriden 445 yeni referans topladı. Bu sadece bir başlangıç.\n\nwhattalk.ai",
    hashtags: ["#WhatTalkAI", "#YapayZekaAsistan", "#ReferansKampanyasi", "#GuzellikMerkezi", "#ElifAgent"],
    date: "19 Mar", slug: "madelyn-marcel-referans",
  },
  {
    id: "static-2", title: "Madelyn Marcel Sonuçları",
    type: "story", src: "/designs/story-madelyn-marcel-sonuclar-2026-03-19.html", html: "",
    caption: "Madelyn Marcel × WhatTalk.ai ilk kampanya sonuçları. 137 referans, 445 yeni isim — hepsi kayıt altında.\n\nwhattalk.ai",
    hashtags: ["#WhatTalkAI", "#YapayZekaAsistan", "#ReferansKampanyasi", "#GuzellikMerkezi"],
    date: "19 Mar", slug: "madelyn-marcel-sonuclar",
  },
  {
    id: "static-3", title: "Otomatik Referans Toplama",
    type: "post", src: "/designs/post-referans-sistemi-2026-03-20.html", html: "",
    caption: "Hizmet bitti, müşteri memnun ayrıldı — ama siz bir daha aramadınız. O müşteri 3 kişiye söyleyebilirdi.\n\nElif bu fırsatı kaçırmıyor.\n\nwhattalk.ai",
    hashtags: ["#WhatTalkAI", "#OtomatikReferans", "#YapayZekaAsistan", "#GuzellikMerkezi", "#ElifAgent"],
    date: "20 Mar", slug: "referans-sistemi",
  },
  {
    id: "static-4", title: "Elif ile Tanışın",
    type: "story", src: "/designs/story-elif-agent-2026-03-20.html", html: "",
    caption: "Elif merkeziniz için çalışmaya hazır. Memnuniyet anketi yapar, referans toplar, şikayetleri yönetir — 7/24 kesintisiz.\n\nwhattalk.ai",
    hashtags: ["#WhatTalkAI", "#YapayZekaAsistan", "#ElifAgent", "#GuzellikMerkezi", "#RandevuSistemi"],
    date: "20 Mar", slug: "elif-agent",
  },
  {
    id: "static-5", title: "Erken Dönüşen Hep Kazandı",
    type: "story", src: "/designs/story-erken-donusen-2026-03-21.html", html: "",
    caption: "1990'lar bilgisayar, 2000'ler internet, 2010'lar mobil — her devrimde erken hareket eden kazandı.\n\n2024+ Yapay Zeka devrimi başladı. Siz hangi taraftasınız?\n\nwhattalk.ai",
    hashtags: ["#WhatTalkAI", "#YapayZekaAsistan", "#ElifAgent", "#GuzellikTeknolojisi", "#YapayZekaDevrimi"],
    date: "21 Mar", slug: "erken-donusen",
  },
  {
    id: "static-6", title: "Erken Dönüşen Reel",
    type: "reel", src: "/designs/story-erken-donusen-reel-2026-03-21.html", html: "",
    caption: "Teknoloji iş hayatını hep dönüştürdü. Erken dönüşen hep kazandı — direnen geride kaldı.\n\n2024+ Yapay Zeka asistanınız Elif sizi bekliyor.\n\nwhattalk.ai",
    hashtags: ["#WhatTalkAI", "#YapayZekaAsistan", "#ElifAgent", "#GuzellikMerkezi", "#YapayZekaDevrimi"],
    date: "21 Mar", slug: "erken-donusen-reel",
  },
  {
    id: "static-7", title: "Animation Test — Referans",
    type: "story", src: "/designs/animation-test.html", html: "",
    caption: "Her memnun müşteri 3 yeni müşteri getirebilir. Yapay Zeka asistanınız Elif, hizmet sonrası her müşteriyi arar.\n\nwhattalk.ai",
    hashtags: ["#WhatTalkAI", "#YapayZekaAsistan", "#OtomatikReferans", "#GuzellikMerkezi", "#ElifAgent"],
    date: "22 Mar", slug: "animation-test-referans",
  },
]

export default function Studio() {
  const router = useRouter()
  const [designs, setDesigns] = useState<Design[]>([])
  const [active, setActive] = useState<Design | null>(null)
  const [chatHistory, setChatHistory] = useState<ChatHistory>({})
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [typing, setTyping] = useState(false)
  const [caption, setCaption] = useState("")
  const [hashtags, setHashtags] = useState<string[]>([])
  const [copied, setCopied] = useState(false)
  const [regenIdx, setRegenIdx] = useState(0)
  const [newCount, setNewCount] = useState(0)
  const [exporting, setExporting] = useState<"png" | "mp4" | null>(null)
  const [exportProgress, setExportProgress] = useState(0)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [exportStatus, setExportStatus] = useState("")
  const [exportError, setExportError] = useState<string | null>(null)
  const [attachedImages, setAttachedImages] = useState<string[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const [animationDone, setAnimationDone] = useState(false)

  // Panel visibility
  const [showList, setShowList] = useState(true)
  const [showChat, setShowChat] = useState(true)
  const [showCaption, setShowCaption] = useState(true)

  // Nav dropdown


  // Brand guide — derived from structured brand data, never edited directly
  const [brandGuide, setBrandGuide] = useState(DEFAULT_BRAND_GUIDE)

  // Derived: per-design chat messages
  const msgs: Msg[] = active ? (chatHistory[active.id] ?? [WELCOME_MSG]) : [WELCOME_MSG]

  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  // Auto-resize textarea when input changes (e.g. from voice transcription)
  useEffect(() => {
    const el = inputRef.current
    if (el) { el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 200) + "px" }
  }, [input])
  const captionRef = useRef<HTMLTextAreaElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleLogout() {
    clearSession()
    router.push("/login")
  }

  // Load from localStorage + one-time seed of static designs
  useEffect(() => {
    if (!getSession()) { router.push("/login"); return }
    try {
      const s = localStorage.getItem("wt_designs_v3")
      let existing: Design[] = s ? JSON.parse(s) : []

      if (!localStorage.getItem("wt_designs_seeded_v2")) {
        const aiOnly = existing.filter(d => !d.src)
        existing = [...STATIC_DESIGNS, ...aiOnly]
        localStorage.setItem("wt_designs_v3", JSON.stringify(existing))
        localStorage.setItem("wt_designs_seeded_v2", "1")
      }

      setDesigns(existing)
      if (existing.length > 0) { setActive(existing[0]); setCaption(existing[0].caption); setHashtags(existing[0].hashtags) }
      // Load brand data and derive guide
      const bd = localStorage.getItem("wt_brand_data_v1")
      if (bd) setBrandGuide(brandDataToGuide(JSON.parse(bd)))

      // Load per-design chat history
      const ch = localStorage.getItem("wt_chat_v1")
      if (ch) setChatHistory(JSON.parse(ch))
    } catch {}
  }, [])

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }) }, [msgs, typing])

  useEffect(() => {
    const el = captionRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = el.scrollHeight + "px"
  }, [caption])

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

  // Scale iframe to fill wrap
  const scaleIframe = useCallback(() => {
    const wrap = wrapRef.current
    const fr = iframeRef.current
    if (!wrap || !fr) return
    const r = wrap.getBoundingClientRect()
    fr.style.transform = `scale(${r.width / 1080})`
  }, [])

  useEffect(() => {
    scaleIframe()
    window.addEventListener("resize", scaleIframe)
    return () => window.removeEventListener("resize", scaleIframe)
  }, [scaleIframe, showList, showChat, showCaption])

  useEffect(() => { setTimeout(scaleIframe, 250) }, [showList, showChat, showCaption, scaleIframe])

  // Detect when iframe animations finish → show replay button
  useEffect(() => {
    const fr = iframeRef.current
    if (!fr || !active || (!active.html && !active.src)) return
    setAnimationDone(false)
    const onLoad = () => {
      try {
        const doc = fr.contentDocument
        if (!doc) return
        const anims = doc.getAnimations()
        if (anims.length === 0) { setAnimationDone(true); return }
        Promise.all(anims.map(a => a.finished)).then(() => setAnimationDone(true)).catch(() => {})
      } catch {}
    }
    fr.addEventListener("load", onLoad)
    // Also check if already loaded
    if (fr.contentDocument?.readyState === "complete") onLoad()
    return () => fr.removeEventListener("load", onLoad)
  }, [active?.id, active?.html, active?.src])

  function replayAnimation() {
    const fr = iframeRef.current
    if (!fr) return
    setAnimationDone(false)
    if (active?.src) {
      // For src-based iframes, reload by re-setting src
      const src = fr.src
      fr.src = ""
      setTimeout(() => { fr.src = src }, 50)
    } else if (active?.html) {
      // For srcDoc-based iframes, re-set the srcDoc
      const doc = fr.srcdoc
      fr.srcdoc = ""
      setTimeout(() => { fr.srcdoc = doc }, 50)
    }
  }

  function persist(list: Design[]) {
    setDesigns(list)
    localStorage.setItem("wt_designs_v3", JSON.stringify(list))
  }

  function addAiMsg(designId: string, text: string) {
    setChatHistory(prev => {
      const existing = prev[designId] ?? []
      const updated = { ...prev, [designId]: [...existing, { role: "ai" as const, text, time: getTime() }] }
      try { localStorage.setItem("wt_chat_v1", JSON.stringify(updated)) } catch {}
      return updated
    })
  }

  function addUserMsg(designId: string, text: string, images?: string[]) {
    setChatHistory(prev => {
      const existing = prev[designId] ?? []
      const updated = { ...prev, [designId]: [...existing, { role: "user" as const, text, time: getTime(), images }] }
      try { localStorage.setItem("wt_chat_v1", JSON.stringify(updated)) } catch {}
      return updated
    })
  }

  function selectDesign(d: Design) {
    setActive(d)
    setCaption(d.caption)
    setHashtags(d.hashtags)
    // Chat history switches automatically — no shared message needed
  }

  function newDesign() {
    const n = newCount + 1
    setNewCount(n)
    const d: Design = {
      id: Date.now().toString(), title: `Yeni Tasarım ${n}`,
      type: "new", html: "", caption: "", hashtags: [], date: "Bugün", slug: `yeni-tasarim-${n}`
    }
    const updated = [d, ...designs]
    persist(updated)
    setActive(d); setCaption(""); setHashtags([])
    // Seed welcome message for this new design
    setTimeout(() => {
      addAiMsg(d.id, "Yeni tasarım oluşturuldu. Ne yapmak istiyorsun? Örn:\n• \"Elif agent için yeni bir story tasarla\"\n• \"Referans kampanyası için post yap\"")
      inputRef.current?.focus()
    }, 50)
  }

  async function generate(topic: string, designId: string, images?: string[]) {
    setLoading(true)
    setTyping(true)
    const lower = topic.toLowerCase()
    const format = lower.includes("reel") ? "Instagram Reels (9:16)"
      : lower.includes("post") ? "Feed Post (1:1)"
      : "Instagram Story (9:16)"
    const agent = lower.includes("zeynep") ? "Zeynep"
      : lower.includes("deniz") ? "Deniz" : "Elif"
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, format, agentName: agent, brandGuide, images })
      })
      const data = await res.json()
      setTyping(false)
      if (!res.ok || !data.html) { addAiMsg(designId, `❌ Hata: ${data.error || "Bilinmeyen hata"}`); return }
      const d: Design = {
        id: Date.now().toString(),
        title: topic.length > 30 ? topic.slice(0, 30) + "…" : topic,
        type: format.includes("Reel") ? "reel" : format.includes("Post") ? "post" : "story",
        html: data.html,
        caption: data.caption || "",
        hashtags: data.hashtags || [],
        date: new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "short" }),
        slug: topic.slice(0, 20).toLowerCase().replace(/\s+/g, "-")
      }
      // Replace the placeholder slot with the real design (same id), or prepend
      const updated = designs.some(x => x.id === designId)
        ? designs.map(x => x.id === designId ? { ...d, id: designId } : x)
        : [d, ...designs]
      persist(updated)
      const finalDesign = { ...d, id: designId }
      setActive(finalDesign); setCaption(d.caption); setHashtags(d.hashtags)
      addAiMsg(designId, `✅ "${d.title}" hazır!\n\nNe yapmak istiyorsun?\n• "caption'ı kısalt"\n• "yeni varyasyon yap"`)
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
      // For static designs (src-based), fetch the HTML first
      let currentHtml = active.html
      if (!currentHtml && active.src) {
        const res = await fetch(active.src)
        currentHtml = await res.text()
      }
      const res = await fetch("/api/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction, existingHtml: currentHtml, brandGuide, images })
      })
      const data = await res.json()
      setTyping(false)
      if (!res.ok || !data.html) { addAiMsg(designId, `❌ Hata: ${data.error || "Bilinmeyen hata"}`); return }

      // Update the design in-place (clear src, set html)
      const updated = designs.map(d =>
        d.id === active.id ? { ...d, html: data.html, src: undefined } : d
      )
      persist(updated)
      const next = updated.find(d => d.id === active.id)!
      setActive(next)
      addAiMsg(designId, "✅ Değişiklik uygulandı! Başka bir düzenleme ister misiniz?")
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

    // Move the active design to the top of the list (most recently active first)
    const idx = designs.findIndex(d => d.id === designId)
    if (idx > 0) {
      const reordered = [designs[idx], ...designs.slice(0, idx), ...designs.slice(idx + 1)]
      persist(reordered)
    }

    const lower = text.toLowerCase()

    // If the active design is empty (new slot) → always generate
    const isEmptySlot = !active.html && !active.src

    // Explicit new-design keywords
    const wantsNew = lower.startsWith("yeni tasarım")
      || lower.includes("yeni tasarım")
      || lower.includes("baştan yap")
      || lower.includes("sıfırdan yap")

    if (isEmptySlot || wantsNew) {
      generate(text, designId, images)
    } else {
      // Default: always edit the currently active design
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
      // Resize to max 1200px and compress to JPEG — keeps payload under ~300 KB
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

  // Helper: get the full HTML string for the active design
  async function getActiveHtml(): Promise<string> {
    if (active!.html) return active!.html
    const res = await fetch(active!.src!)
    return res.text()
  }

  async function exportPng() {
    if (!active || exporting || (!active.html && !active.src)) return
    setExporting("png")
    setExportModalOpen(true)
    setExportError(null)
    setExportProgress(10)
    try {
      const html = await getActiveHtml()
      setExportProgress(30)
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html, mode: "png" }),
      })
      if (!res.ok) throw new Error(await res.text())
      setExportProgress(80)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.download = `${active.title.slice(0, 40)}.png`
      a.href = url
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      setExportProgress(100)
      setExportStatus("PNG kaydedildi!")
    } catch (e) {
      console.error("PNG export:", e)
      setExportError(e instanceof Error ? e.message : String(e))
    }
    finally { setExporting(null) }
  }

  async function exportMp4() {
    if (!active || exporting || (!active.html && !active.src)) return
    setExporting("mp4")
    setExportModalOpen(true)
    setExportError(null)
    setExportProgress(10)
    setExportStatus("Hazırlanıyor…")
    try {
      const html = await getActiveHtml()
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html, mode: "frames", duration: 6000, fps: 3 }),
      })
      if (!res.ok) throw new Error(await res.text())
      const { frames, fps: serverFps } = await res.json() as { frames: string[], fps: number }

      setExportProgress(50)
      setExportStatus("Video kodlanıyor…")

      // Encode frames to true H.264 MP4 using Web Codecs API + mp4-muxer
      const { Muxer, ArrayBufferTarget } = await import("mp4-muxer")
      const muxer = new Muxer({
        target: new ArrayBufferTarget(),
        video: { codec: "avc", width: 1080, height: 1920 },
        fastStart: "in-memory",
      })

      // Try H.264 codec variants from most to least compatible
      const h264Variants = ["avc1.42E01E", "avc1.42001f", "avc1.4D0028", "avc1.640028"]
      let videoConfig: VideoEncoderConfig | null = null
      for (const codec of h264Variants) {
        const cfg: VideoEncoderConfig = { codec, width: 1080, height: 1920, bitrate: 6_000_000, framerate: serverFps }
        const { supported } = await VideoEncoder.isConfigSupported(cfg)
        if (supported) { videoConfig = cfg; break }
      }
      if (!videoConfig) throw new Error("H.264 encoding not supported in this browser. Please use Chrome or Edge.")

      let encodeError: Error | null = null
      const encoder = new VideoEncoder({
        output: (chunk, meta) => muxer.addVideoChunk(chunk, meta ?? undefined),
        error: (e) => { encodeError = e as Error },
      })
      encoder.configure(videoConfig)

      for (let i = 0; i < frames.length; i++) {
        if (encodeError) throw encodeError
        const img = new Image()
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve()
          img.onerror = reject
          img.src = `data:image/jpeg;base64,${frames[i]}`
        })
        const bitmap = await createImageBitmap(img)
        const frame = new VideoFrame(bitmap, {
          timestamp: Math.round((i * 1_000_000) / serverFps),
          duration: Math.round(1_000_000 / serverFps),
        })
        encoder.encode(frame, { keyFrame: i % serverFps === 0 })
        frame.close()
        bitmap.close()
        setExportProgress(50 + Math.round(((i + 1) / frames.length) * 45))
      }

      await encoder.flush()
      if (encodeError) throw encodeError
      setExportStatus("Tamamlanıyor…")
      setExportProgress(97)
      muxer.finalize()

      const buffer = (muxer.target as InstanceType<typeof ArrayBufferTarget>).buffer
      const blob = new Blob([buffer], { type: "video/mp4" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.download = `${active.title.slice(0, 40)}.mp4`
      a.href = url
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 2000)
      setExportProgress(100)
      setExportStatus("MP4 kaydedildi!")
    } catch (e) {
      console.error("MP4 export:", e)
      setExportError(e instanceof Error ? e.message : String(e))
    }
    finally { setExporting(null) }
  }

  function regenerate() {
    if (!active) return
    const designId = active.id
    setTyping(true)
    setTimeout(() => {
      setTyping(false)
      setCaption(REGEN[regenIdx % REGEN.length])
      setRegenIdx(i => i + 1)
      addAiMsg(designId, "Yeni versiyon hazır! Beğendiyseniz kopyalayabilirsiniz. 🎉")
    }, 1400)
  }

  function copyCaption() {
    if (!active) return
    const designId = active.id
    const text = caption + (hashtags.length ? "\n\n" + hashtags.join(" ") : "")
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      addAiMsg(designId, "Caption panoya kopyalandı ✓")
    })
  }

  const charCount = caption.length + (hashtags.length ? hashtags.join(" ").length + 2 : 0)

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#0c0c0c", color: "#e6e6e6", fontFamily: "'Inter', -apple-system, sans-serif", overflow: "hidden" }}>

      {/* ══ EXPORT MODAL ══ */}
      {exportModalOpen && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(0,0,0,0.7)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            background: "#141414",
            border: "1px solid #2a2a2a",
            borderRadius: 14,
            padding: "28px 32px",
            width: 360,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}>
            {/* Title */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {exporting === "png" || (!exporting && !exportError && exportStatus === "PNG saved!") ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="#e5e5e5" strokeWidth="2"/><circle cx="8.5" cy="8.5" r="1.5" stroke="#e5e5e5" strokeWidth="2"/><polyline points="21 15 16 10 5 21" stroke="#e5e5e5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><polygon points="23 7 16 12 23 17 23 7" fill="#e5e5e5"/><rect x="1" y="5" width="15" height="14" rx="2" stroke="#e5e5e5" strokeWidth="2" fill="none"/></svg>
              )}
              <span style={{ color: "#e5e5e5", fontSize: 14, fontWeight: 600 }}>
                {exporting === "png" || exportStatus === "PNG kaydedildi!" ? "PNG Aktarılıyor" : "MP4 Aktarılıyor"}
              </span>
            </div>

            {/* Progress bar */}
            {!exportError && (
              <div style={{ background: "#222", borderRadius: 6, height: 6, overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: `${exportProgress}%`,
                  background: exportProgress === 100 ? "#3ecf8e" : "#00C2A8",
                  borderRadius: 6,
                  transition: "width 0.3s ease",
                }} />
              </div>
            )}

            {/* Status */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {exportError ? (
                <span style={{ color: "#f87171", fontSize: 12 }}>⚠ {exportError}</span>
              ) : exportProgress === 100 ? (
                <span style={{ color: "#3ecf8e", fontSize: 13, fontWeight: 500 }}>✓ {exportStatus}</span>
              ) : (
                <>
                  <div style={{ width: 10, height: 10, border: "1.5px solid #444", borderTopColor: "#00C2A8", borderRadius: "50%", animation: "spin 0.75s linear infinite", flexShrink: 0 }} />
                  <span style={{ color: "#888", fontSize: 13, fontWeight: 600 }}>{exportProgress}%</span>
                </>
              )}
            </div>

            {/* Close button — only active when done or error */}
            <button
              onClick={() => { setExportModalOpen(false); setExportError(null); setExportProgress(0); setExportStatus("") }}
              disabled={!!exporting}
              style={{
                marginTop: 4,
                padding: "8px 0",
                background: exporting ? "#1a1a1a" : "#222",
                color: exporting ? "#444" : "#e5e5e5",
                border: "1px solid #2a2a2a",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                cursor: exporting ? "not-allowed" : "pointer",
              }}
            >
              {exporting ? "Lütfen bekleyin…" : "Kapat"}
            </button>
          </div>
        </div>
      )}

      {/* ══ TOPBAR ══ */}
      <div style={{ height: 50, background: "#141414", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", padding: "0 12px 0 10px", gap: 6, flexShrink: 0, zIndex: 100 }}>

        <span style={{ fontSize: 16, fontWeight: 700, color: "#e6e6e6", letterSpacing: "-0.03em", margin: "0 4px" }}>Postable</span>

        <button onClick={() => setShowList(v => !v)} title="Tasarım listesi" style={{ ...S.panelBtn, color: showList ? "#fff" : "#6b6b6b" }}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.3"/><path d="M5.5 1v14" stroke="currentColor" strokeWidth="1.3"/></svg>
        </button>

        <div style={S.tbDiv}/>
        <span style={{ fontSize: 11, color: "#6b6b6b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 200 }}>
          {active ? active.slug || active.title.toLowerCase().replace(/\s+/g, "-") : "yeni-tasarım"}
        </span>

        <div style={{ flex: 1 }}/>

        {/* Workspace tabs */}
        <div style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: 2, gap: 2 }}>
          <a href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", background: "rgba(255,255,255,0.1)", color: "#fff", transition: "all 0.15s" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5"/><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/><polyline points="21 15 16 10 5 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            Studio
          </a>
          <a href="/brand" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", background: "transparent", color: "#6b6b6b", transition: "all 0.15s" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Brand
          </a>
        </div>

        <div style={{ flex: 1 }}/>

        <div style={S.tbDiv}/>

        <button onClick={() => setShowCaption(v => !v)} title="Caption paneli" style={{ ...S.panelBtn, color: showCaption ? "#fff" : "#6b6b6b" }}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.3"/><path d="M10.5 1v14" stroke="currentColor" strokeWidth="1.3"/></svg>
        </button>

        <div style={S.tbDiv}/>

        <button
          onClick={exportPng}
          disabled={!active || exporting !== null || (!active.html && !active.src)}
          title="PNG olarak indir"
          style={{ ...S.btnGhost, opacity: (!active || exporting !== null || (!active?.html && !active?.src)) ? 0.4 : 1 }}
        >
          {exporting === "png" ? (
            <div style={{ width: 9, height: 9, border: "1.5px solid #6b6b6b", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.75s linear infinite" }}/>
          ) : (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/><circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="2"/><polyline points="21 15 16 10 5 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          )}
          PNG
        </button>
        <button
          onClick={exportMp4}
          disabled={!active || exporting !== null || (!active.html && !active.src)}
          title="MP4 olarak indir (8 sn)"
          style={{ ...S.btnSolid, opacity: (!active || exporting !== null || (!active?.html && !active?.src)) ? 0.4 : 1, position: "relative", overflow: "hidden" }}
        >
          {exporting === "mp4" && (
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${exportProgress}%`, background: "rgba(0,194,168,0.18)", transition: "width 0.2s" }}/>
          )}
          {exporting === "mp4" ? (
            <div style={{ width: 9, height: 9, border: "1.5px solid #6b6b6b", borderTopColor: "#00C2A8", borderRadius: "50%", animation: "spin 0.75s linear infinite" }}/>
          ) : (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><polygon points="23 7 16 12 23 17 23 7" fill="currentColor"/><rect x="1" y="5" width="15" height="14" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
          )}
          {exporting === "mp4" ? `${exportProgress}%` : "MP4"}
        </button>

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

        {/* ── COL 1: POST LIST ── */}
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
                    <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3, textTransform: "uppercase" as const, letterSpacing: "0.04em", background: "rgba(255,255,255,0.07)", color: "#6b6b6b" }}>{d.type}</span>
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
              <div style={{ fontSize: 9.5, color: "#6b6b6b" }}>WhatTalk.ai · İçerik Stüdyosu</div>
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
            <div style={{ display: "flex", flexDirection: "column", background: isDragging ? "rgba(0,194,168,0.04)" : "#2f2f2f", border: `1px solid ${isDragging ? "rgba(0,194,168,0.5)" : "rgba(255,255,255,0.08)"}`, borderRadius: 24, padding: "0", transition: "border-color 0.15s", overflow: "hidden" }}>
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
                  placeholder={isDragging ? "Görseli bırak…" : "Mesaj yazın"}
                  rows={1}
                  disabled={loading}
                  style={{ width: "100%", fontFamily: "inherit", fontSize: 15, color: "#ececec", background: "transparent", border: "none", outline: "none", resize: "none", minHeight: 24, maxHeight: 200, lineHeight: 1.6, padding: 0 }}
                />
              </div>
              {/* Bottom action row: + on left, mic & send on right */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 8px 8px" }}>
                {/* Left: attach button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  title="Görsel ekle"
                  style={{ width: 32, height: 32, borderRadius: "50%", background: "transparent", border: "none", color: isDragging ? "#00C2A8" : "#b4b4b4", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: 0, transition: "color 0.15s, background 0.15s" }}
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

        {/* ── COL 3: PREVIEW ── */}
        <div style={{ flex: 1, background: "#0c0c0c", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative", minWidth: 0 }}>
          {!active || (!active.html && !active.src) ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 36, opacity: 0.08, marginBottom: 10 }}>✦</div>
              <p style={{ fontSize: 12, color: "#3d3d3d" }}>Sol panelden konu gir veya mevcut tasarımı seç</p>
            </div>
          ) : (
            <div ref={wrapRef} style={{ height: "100%", aspectRatio: "9/16", position: "relative", overflow: "hidden", flexShrink: 0, borderRadius: 4 }}>
              <iframe
                ref={iframeRef}
                {...(active.src ? { src: active.src } : { srcDoc: active.html, sandbox: "allow-scripts allow-same-origin" })}
                onLoad={scaleIframe}
                scrolling="no"
                style={{ position: "absolute", top: 0, left: 0, width: 1080, height: 1920, border: "none", transformOrigin: "top left", pointerEvents: "none", display: "block", overflow: "hidden" }}
              />
              {/* Replay button overlay */}
              {animationDone && !loading && (
                <button
                  onClick={replayAnimation}
                  style={{
                    position: "absolute", inset: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: "rgba(0,0,0,0.35)", border: "none", cursor: "pointer",
                    transition: "background 0.2s",
                    zIndex: 10,
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.5)" }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.35)" }}
                >
                  <div style={{
                    width: 56, height: 56, borderRadius: "50%",
                    background: "rgba(255,255,255,0.15)",
                    backdropFilter: "blur(8px)",
                    border: "1px solid rgba(255,255,255,0.25)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <polygon points="8,5 20,12 8,19" fill="#fff" />
                    </svg>
                  </div>
                </button>
              )}
            </div>
          )}
          {loading && (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(12,12,12,0.8)", backdropFilter: "blur(4px)" }}>
              <div style={{ width: 32, height: 32, border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.75s linear infinite" }}/>
              <p style={{ fontSize: 12, color: "#6b6b6b", marginTop: 12 }}>Agents çalışıyor…</p>
            </div>
          )}
        </div>

        {/* ── COL 4: CAPTION ── */}
        <div style={{ width: showCaption ? 280 : 0, flexShrink: 0, background: "#1c1c1c", borderLeft: showCaption ? "1px solid rgba(255,255,255,0.06)" : "none", display: "flex", flexDirection: "column", overflow: "hidden", transition: "width 0.22s ease" }}>

          <div style={{ padding: "11px 13px 9px", borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#e6e6e6" }}>Caption</div>
              <div style={{ fontSize: 8.5, fontWeight: 700, color: "#fff", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.16)", padding: "1.5px 6px", borderRadius: 4, letterSpacing: "0.05em" }}>✦ YAPAY ZEKA</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#111", border: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" fill="none"/><path d="M8 13 Q12 17 16 13" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" fill="none"/></svg>
              </div>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: "#e6e6e6" }}>whattalk.ai_turkce</div>
                <div style={{ fontSize: 9.5, color: "#6b6b6b" }}>WhatTalk.ai · Yapay Zeka</div>
              </div>
            </div>
          </div>

          <div style={{ flex: 1, padding: "10px 13px", overflowY: "auto" as const, display: "flex", flexDirection: "column", gap: 9 }}>
            {!active ? (
              <p style={{ fontSize: 11, color: "#3d3d3d", lineHeight: 1.6 }}>Tasarım oluşturulduğunda caption ve hashtag&apos;ler burada görünecek.</p>
            ) : (
              <>
                <div>
                  <div style={{ fontSize: 9.5, fontWeight: 700, color: "#6b6b6b", textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 5 }}>Gönderi Metni</div>
                  <textarea
                    ref={captionRef}
                    value={caption}
                    onChange={e => setCaption(e.target.value)}
                    style={{ fontFamily: "inherit", fontSize: 11.5, lineHeight: 1.6, color: "#e6e6e6", background: "#1c1c1c", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "8px 10px", resize: "none", outline: "none", width: "100%", minHeight: 60, overflow: "hidden", display: "block" }}
                  />
                  <div style={{ fontSize: 9.5, color: "#3d3d3d", textAlign: "right" }}>{charCount} / 2.200</div>
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <div style={{ fontSize: 9.5, fontWeight: 700, color: "#6b6b6b", textTransform: "uppercase" as const, letterSpacing: "0.07em" }}>Hashtag&apos;ler</div>
                    <button
                      onClick={() => setHashtags(h => [...h, "#"])}
                      style={{ fontSize: 9.5, fontWeight: 600, padding: "2px 8px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#6b6b6b", cursor: "pointer", fontFamily: "inherit" }}
                    >+ Ekle</button>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 5 }}>
                    {hashtags.map((h, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 3, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 20, padding: "2px 4px 2px 9px" }}>
                        <input
                          value={h}
                          onChange={e => setHashtags(prev => prev.map((v, idx) => idx === i ? e.target.value : v))}
                          style={{ fontSize: 10, fontWeight: 500, color: "#fff", background: "transparent", border: "none", outline: "none", width: Math.max(40, h.length * 6.5) }}
                        />
                        <button
                          onClick={() => setHashtags(prev => prev.filter((_, idx) => idx !== i))}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#4d4d4d", padding: "1px 3px", display: "flex", alignItems: "center", borderRadius: 10, lineHeight: 1 }}
                        >×</button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <div style={{ padding: "9px 13px 12px", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 5 }}>
              <button onClick={regenerate} disabled={loading} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontFamily: "inherit", fontSize: 10.5, fontWeight: 600, padding: 7, borderRadius: 7, border: "none", cursor: "pointer", background: "#fff", color: "#0c0c0c", transition: "all 0.15s" }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="#0c0c0c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Yeniden Üret
              </button>
              <button onClick={copyCaption} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontFamily: "inherit", fontSize: 10.5, fontWeight: 600, padding: 7, borderRadius: 7, border: "1px solid rgba(255,255,255,0.07)", cursor: "pointer", background: copied ? "#fff" : "#1c1c1c", color: copied ? "#0c0c0c" : "#e6e6e6", transition: "all 0.15s" }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                {copied ? "✓ Kopyalandı" : "Kopyala"}
              </button>
            </div>
            <div style={{ fontSize: 9.5, color: "#3d3d3d", textAlign: "center" }}>Metni doğrudan düzenleyebilirsiniz</div>
          </div>
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
  btnSolid: { display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, padding: "5px 11px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.07)", cursor: "pointer", background: "#1c1c1c", color: "#e6e6e6", whiteSpace: "nowrap" } as React.CSSProperties,
}
