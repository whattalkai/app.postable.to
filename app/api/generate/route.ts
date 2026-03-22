import Anthropic from "@anthropic-ai/sdk"
import { BRAND_AGENT_PROMPT, DESIGNER_AGENT_PROMPT } from "@/lib/agents/brand"

const client = new Anthropic()

const CAPTION_AGENT_PROMPT = `
Sen WhatTalk.ai için bir sosyal medya metin yazarısın.
Sana verilen kreatif briefingi ve konuya göre Instagram caption ve hashtag listesi üret.

SADECE şu JSON formatında döndür:
{
  "caption": "Instagram gönderisi için tam metin (emoji ile, Türkçe, siz dili, 150-220 kelime)",
  "hashtags": ["#whattalk", "#yapay zeka", ...] (20-25 adet ilgili hashtag)
}

Kurallar:
- Türkçe, resmi "siz" dili
- Asla "AI" yazma — "Yapay Zeka" kullan
- İlk satır dikkat çekici olmalı (hook)
- CTA ile bitir
- Sadece JSON döndür
`

type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp"

function buildContent(
  images: string[] | undefined,
  textBlock: string
): Anthropic.MessageParam["content"] {
  if (!images || images.length === 0) return textBlock

  const parts: Anthropic.ContentBlockParam[] = [
    { type: "text", text: "İlham görseller (stil, renk ve kompozisyonu referans al):" },
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
    const { topic, format, agentName, brandGuide, images } = await req.json()

    if (!topic || !format || !agentName) {
      return Response.json({ error: "Eksik parametreler" }, { status: 400 })
    }

    const brandContext = brandGuide
      ? `\n\n## Marka Rehberi (Kullanıcı Tanımlı)\n${brandGuide}`
      : ""

    // ── AGENT 1: Brand Agent ──
    const brandResponse = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: BRAND_AGENT_PROMPT + brandContext,
      messages: [{
        role: "user",
        content: `Konu: ${topic}\nFormat: ${format}\nAjans karakteri: ${agentName}`
      }]
    })

    const brandBrief = brandResponse.content[0].type === "text"
      ? brandResponse.content[0].text.trim()
      : "{}"

    // ── AGENT 2 + 3: Designer & Caption in parallel ──
    const designerText = `Marka Briefingi:\n${brandBrief}\n\nKonu: ${topic}\nFormat: ${format}\nAjans: ${agentName}`

    const [designStream, captionResponse] = await Promise.all([
      client.messages.stream({
        model: "claude-sonnet-4-6",
        max_tokens: 8192,
        system: DESIGNER_AGENT_PROMPT,
        messages: [{ role: "user", content: buildContent(images, designerText) }]
      }),
      client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: CAPTION_AGENT_PROMPT,
        messages: [{
          role: "user",
          content: `Konu: ${topic}\nFormat: ${format}\nAjans: ${agentName}\nBriefing: ${brandBrief}`
        }]
      })
    ])

    const finalMessage = await designStream.finalMessage()

    let html = finalMessage.content[0].type === "text"
      ? finalMessage.content[0].text.trim()
      : ""

    // Strip markdown code fences if present
    if (html.startsWith("```html")) {
      html = html.replace(/^```html\n?/, "").replace(/```$/, "").trim()
    } else if (html.startsWith("```")) {
      html = html.replace(/^```\n?/, "").replace(/```$/, "").trim()
    }

    // Parse caption response
    let caption = ""
    let hashtags: string[] = []
    try {
      const captionRaw = captionResponse.content[0].type === "text"
        ? captionResponse.content[0].text.trim()
        : "{}"
      const cleanCaption = captionRaw.replace(/^```json\n?/, "").replace(/^```\n?/, "").replace(/```$/, "").trim()
      const parsed = JSON.parse(cleanCaption)
      caption = parsed.caption || ""
      hashtags = parsed.hashtags || []
    } catch {
      caption = ""
      hashtags = []
    }

    return Response.json({ html, brandBrief, caption, hashtags })

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error("Generate error:", msg)
    return Response.json({ error: msg }, { status: 500 })
  }
}
