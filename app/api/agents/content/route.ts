import Anthropic from "@anthropic-ai/sdk"
import { CONTENT_AGENT_PROMPT } from "@/lib/agents/content"

const client = new Anthropic()

export async function POST(req: Request) {
  try {
    const { topic, targetPlatform, duration, language, brandGuide } = await req.json()

    if (!topic) {
      return Response.json({ error: "topic is required" }, { status: 400 })
    }

    const lang = language || "tr"
    const platform = targetPlatform || "instagram"
    const targetDuration = duration || 60

    const brandContext = brandGuide
      ? `\n\nMarka Rehberi:\n${brandGuide}`
      : ""

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: CONTENT_AGENT_PROMPT + brandContext,
      messages: [
        {
          role: "user",
          content: `Konu: ${topic}
Platform: ${platform}
Hedef süre: ${targetDuration} saniye
Dil: ${lang}

Bu konuda bir video senaryosu üret.`,
        },
      ],
    })

    const raw = response.content[0].type === "text" ? response.content[0].text.trim() : "{}"
    const clean = raw.replace(/^```json\n?/, "").replace(/^```\n?/, "").replace(/```$/, "").trim()

    const content = JSON.parse(clean)

    return Response.json({ success: true, content })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error("Content Agent error:", msg)
    return Response.json({ error: msg }, { status: 500 })
  }
}
