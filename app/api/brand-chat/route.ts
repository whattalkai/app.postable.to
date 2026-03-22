import Anthropic from "@anthropic-ai/sdk"
import { BRAND_INTERVIEW_AGENT_PROMPT } from "@/lib/agents/brand"

const client = new Anthropic()

export async function POST(req: Request) {
  try {
    const { messages, brandData } = await req.json()

    if (!messages || messages.length === 0) {
      return Response.json({ error: "Mesaj gerekli" }, { status: 400 })
    }

    const brandContext = brandData
      ? `\n\nMevcut Marka Verisi:\n${JSON.stringify(brandData, null, 2)}`
      : ""

    const anthropicMessages = messages.map((m: { role: string; text: string }) => ({
      role: m.role === "user" ? "user" as const : "assistant" as const,
      content: m.text,
    }))

    const stream = client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: BRAND_INTERVIEW_AGENT_PROMPT + brandContext,
      messages: anthropicMessages,
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (
              chunk.type === "content_block_delta" &&
              chunk.delta.type === "text_delta"
            ) {
              controller.enqueue(encoder.encode(chunk.delta.text))
            }
          }
          controller.close()
        } catch (e) {
          controller.error(e)
        }
      },
    })

    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error("Brand chat error:", msg)
    return Response.json({ error: msg }, { status: 500 })
  }
}
