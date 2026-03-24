import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic()

const EDITOR_PROMPT = `Sen WhatTalk.ai için bir kreatif tasarımcısın.
Sana mevcut bir HTML tasarımı ve kullanıcının düzenleme isteği verilecek.
Tasarımı isteğe göre düzenle ve sonucu JSON formatında döndür.

KRİTİK KURAL — TASARIMI ASLA SİLME:
- Mevcut HTML'in TAMAMINI döndürmelisin — sadece istenen kısmı değiştir
- Eğer bir elementi kaldırman isteniyorsa, sadece o elementi sil, geri kalan HER ŞEYİ aynen bırak
- HTML çıktın, orijinal HTML ile aynı genel uzunlukta olmalı (sadece istenen değişiklik kadar fark)
- Boş veya eksik HTML döndürme — bu tasarımı siler ve geri alınamaz

ZORUNLU KURALLAR:
- Orijinal tasarımın genel yapısını, stilini, boyutlarını ve animasyonlarını koru
- SADECE istenen değişikliği yap — gereksiz hiçbir şeyi değiştirme
- Canvas: 1080x1920px (9:16) — asla değiştirme
- Font: sadece Inter — asla değiştirme
- Asla "AI" yazma — her zaman "Yapay Zeka" kullan
- PNG/MP4 indir butonları gibi export araçlarını kaldırma isteği gelirse: HTML'den o button/div'i tamamen çıkar

ÇIKTI FORMATI — kesinlikle şu JSON formatında döndür, başka hiçbir şey yazma:
{"html": "...düzenlenmiş tam HTML kodu...", "message": "...kullanıcıya doğal, sıcak ve kısa bir Türkçe yanıt. Ne yaptığını 1-2 cümleyle açıkla. Robotik olma, doğal konuş..."}

message örnekleri:
- "Mor butonu kaldırdım, tasarımın geri kalanı aynen duruyor. Başka bir değişiklik ister misin?"
- "Başlık fontunu büyüttüm ve kalın yaptım, şimdi daha dikkat çekici görünüyor."
- "Arka plan rengini siyahtan koyu griye değiştirdim. Beğenmediysen geri alabilirim."
Sadece JSON döndür — markdown, açıklama, kod bloğu çerçevesi YASAK.`

type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp"

function buildContent(
  images: string[] | undefined,
  textBlock: string
): Anthropic.MessageParam["content"] {
  if (!images || images.length === 0) return textBlock

  const parts: Anthropic.ContentBlockParam[] = [
    { type: "text", text: "Referans görseller (stil, renk ve kompozisyonu tasarımda referans olarak kullan):" },
  ]

  for (const dataUrl of images) {
    const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
    if (m) {
      parts.push({
        type: "image",
        source: {
          type: "base64",
          media_type: m[1] as ImageMediaType,
          data: m[2],
        },
      })
    }
  }

  parts.push({ type: "text", text: `\n${textBlock}` })
  return parts
}

export async function POST(req: Request) {
  try {
    const { instruction, existingHtml, brandGuide, images } = await req.json()

    if (!existingHtml) {
      return Response.json({ error: "Eksik parametreler" }, { status: 400 })
    }

    const brandContext = brandGuide
      ? `\n\nMarka Rehberi:\n${brandGuide}`
      : ""

    const editText = `Mevcut HTML:\n${existingHtml}\n\nDüzenleme isteği: ${instruction || "Bu görseli referans alarak tasarımı güncelle"}`

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 16384,
      system: EDITOR_PROMPT + brandContext,
      messages: [{ role: "user", content: buildContent(images, editText) }]
    })

    let raw = response.content[0].type === "text"
      ? response.content[0].text.trim()
      : ""

    // Strip markdown code fences if present
    if (raw.startsWith("```json")) {
      raw = raw.replace(/^```json\n?/, "").replace(/```$/, "").trim()
    } else if (raw.startsWith("```html")) {
      raw = raw.replace(/^```html\n?/, "").replace(/```$/, "").trim()
    } else if (raw.startsWith("```")) {
      raw = raw.replace(/^```\n?/, "").replace(/```$/, "").trim()
    }

    // Try parsing as JSON (new format with html + message)
    let html = ""
    let message = ""
    try {
      const parsed = JSON.parse(raw)
      html = parsed.html || ""
      message = parsed.message || ""
    } catch {
      // Fallback: AI returned raw HTML (old format)
      html = raw
      message = ""
    }

    // ── SAFEGUARD: never return broken/empty/truncated HTML ──
    const hasDoctype = html.toLowerCase().includes("<!doctype") || html.toLowerCase().includes("<html")
    const hasBody = html.toLowerCase().includes("<body")
    const tooShort = html.length < existingHtml.length * 0.3 // less than 30% of original = suspicious

    if (!html || !hasDoctype || !hasBody || tooShort) {
      console.error("Edit safeguard triggered:", {
        htmlLength: html.length,
        originalLength: existingHtml.length,
        hasDoctype,
        hasBody,
        tooShort,
      })
      return Response.json({
        html: existingHtml,
        message: "⚠️ Düzenleme güvenli görünmüyordu, tasarımını korumak için değişikliği uygulamadım. Lütfen tekrar dene veya farklı bir şekilde iste.",
      })
    }

    return Response.json({ html, message })

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error("Edit error:", msg)
    return Response.json({ error: msg }, { status: 500 })
  }
}
