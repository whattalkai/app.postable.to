import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic()

const WEBPAGE_EDITOR_PROMPT = `Sen profesyonel bir web tasarımcısın.
Sana mevcut bir websitesi HTML tasarımı ve kullanıcının düzenleme isteği verilecek.
Tasarımı isteğe göre düzenle ve sonucu JSON formatında döndür.

KRİTİK KURAL — TASARIMI ASLA SİLME:
- Mevcut HTML'in TAMAMINI döndürmelisin — sadece istenen kısmı değiştir
- Eğer bir elementi kaldırman isteniyorsa, sadece o elementi sil, geri kalan HER ŞEYİ aynen bırak
- HTML çıktın, orijinal HTML ile aynı genel uzunlukta olmalı (sadece istenen değişiklik kadar fark)
- Boş veya eksik HTML döndürme — bu tasarımı siler ve geri alınamaz

ZORUNLU KURALLAR:
- Orijinal tasarımın genel yapısını, stilini ve animasyonlarını koru
- SADECE istenen değişikliği yap — gereksiz hiçbir şeyi değiştirme
- Tam genişlik (width: 100%) layout'u koru
- Font: sadece Inter — asla değiştirme
- Modern web tasarım standartlarını koru
- Asla "AI" yazma — her zaman "Yapay Zeka" kullan

ÇIKTI FORMATI — kesinlikle şu JSON formatında döndür, başka hiçbir şey yazma:
{"html": "...düzenlenmiş tam HTML kodu...", "message": "...kullanıcıya doğal, sıcak ve kısa bir Türkçe yanıt. Ne yaptığını 1-2 cümleyle açıkla..."}

message örnekleri:
- "Hero bölümündeki başlığı değiştirdim, daha dikkat çekici oldu."
- "Yeni bir testimonials bölümü ekledim, müşteri yorumları ile."
- "Renk paletini mordan maviye çevirdim, tüm sayfada tutarlı."
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

    const editText = `Mevcut Websitesi HTML:\n${existingHtml}\n\nDüzenleme isteği: ${instruction || "Bu görseli referans alarak tasarımı güncelle"}`

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 16384,
      system: WEBPAGE_EDITOR_PROMPT + brandContext,
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
    const lowerHtml = html.toLowerCase()
    const hasStructure = lowerHtml.includes("<!doctype") || lowerHtml.includes("<html") || lowerHtml.includes("<body") || lowerHtml.includes("<div")
    const tooShort = html.length < existingHtml.length * 0.15

    if (!html || !hasStructure || tooShort) {
      console.error("Webpage edit safeguard triggered:", {
        htmlLength: html.length,
        originalLength: existingHtml.length,
        ratio: html.length / existingHtml.length,
        hasStructure,
        tooShort,
        htmlPreview: html.substring(0, 200),
      })
      return Response.json({
        html: existingHtml,
        message: "⚠️ Düzenleme güvenli görünmüyordu, tasarımını korumak için değişikliği uygulamadım. Lütfen tekrar dene veya farklı bir şekilde iste.",
      })
    }

    return Response.json({ html, message })

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error("Webpage edit error:", msg)
    return Response.json({ error: msg }, { status: 500 })
  }
}
