import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic()

const EDITOR_PROMPT = `Sen WhatTalk.ai için bir kreatif tasarımcısın.
Sana mevcut bir HTML tasarımı ve kullanıcının düzenleme isteği verilecek.
Tasarımı isteğe göre düzenleyip SADECE değiştirilmiş HTML'i döndür.

ZORUNLU KURALLAR:
- Orijinal tasarımın genel yapısını, stilini, boyutlarını ve animasyonlarını koru
- SADECE istenen değişikliği yap — gereksiz hiçbir şeyi değiştirme
- Canvas: 1080x1920px (9:16) — asla değiştirme
- Font: sadece Inter — asla değiştirme
- Asla "AI" yazma — her zaman "Yapay Zeka" kullan
- PNG/MP4 indir butonları gibi export araçlarını kaldırma isteği gelirse: HTML'den o button/div'i tamamen çıkar
- Sadece HTML döndür — markdown, açıklama, kod bloğu çerçevesi YASAK`

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
      max_tokens: 8192,
      system: EDITOR_PROMPT + brandContext,
      messages: [{ role: "user", content: buildContent(images, editText) }]
    })

    let html = response.content[0].type === "text"
      ? response.content[0].text.trim()
      : ""

    if (html.startsWith("```html")) {
      html = html.replace(/^```html\n?/, "").replace(/```$/, "").trim()
    } else if (html.startsWith("```")) {
      html = html.replace(/^```\n?/, "").replace(/```$/, "").trim()
    }

    return Response.json({ html })

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error("Edit error:", msg)
    return Response.json({ error: msg }, { status: 500 })
  }
}
