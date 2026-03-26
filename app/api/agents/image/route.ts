import Anthropic from "@anthropic-ai/sdk"
import { IMAGE_PROMPT_AGENT } from "@/lib/agents/content"

const client = new Anthropic()

export async function POST(req: Request) {
  try {
    const { scenes, brandGuide, style, provider } = await req.json()

    if (!scenes || !Array.isArray(scenes) || scenes.length === 0) {
      return Response.json({ error: "scenes array is required" }, { status: 400 })
    }

    const imageProvider = provider || "openai" // "openai" (DALL-E) or "stability"

    const images = []

    for (const scene of scenes) {
      // Step 1: Generate optimized image prompt via Claude
      const promptResponse = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        system: IMAGE_PROMPT_AGENT,
        messages: [
          {
            role: "user",
            content: `Scene ${scene.sceneNumber}: ${scene.visualDescription}
${brandGuide ? `Brand context: ${brandGuide}` : ""}
${style ? `Style preference: ${style}` : ""}`,
          },
        ],
      })

      const promptRaw = promptResponse.content[0].type === "text" ? promptResponse.content[0].text.trim() : "{}"
      const promptClean = promptRaw.replace(/^```json\n?/, "").replace(/^```\n?/, "").replace(/```$/, "").trim()
      let promptData
      try {
        promptData = JSON.parse(promptClean)
      } catch {
        promptData = { prompt: scene.visualDescription, negativePrompt: "", style: "photo" }
      }

      // Step 2: Generate image via DALL-E 3
      if (imageProvider === "openai") {
        const openaiKey = process.env.OPENAI_API_KEY
        if (!openaiKey) {
          return Response.json({ error: "OPENAI_API_KEY is not set" }, { status: 500 })
        }

        const dalleRes = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openaiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "dall-e-3",
            prompt: `${promptData.prompt}. Style: ${promptData.style || "modern professional"}. Portrait orientation 9:16. Clean background suitable for video overlay. ${promptData.negativePrompt ? `Avoid: ${promptData.negativePrompt}` : ""}`,
            n: 1,
            size: "1024x1792",
            response_format: "b64_json",
          }),
        })

        if (!dalleRes.ok) {
          const err = await dalleRes.text()
          console.error(`DALL-E error for scene ${scene.sceneNumber}:`, err)
          images.push({
            sceneNumber: scene.sceneNumber,
            error: `Image generation failed: ${err}`,
            prompt: promptData.prompt,
          })
          continue
        }

        const dalleData = await dalleRes.json()
        const imageBase64 = dalleData.data?.[0]?.b64_json

        images.push({
          sceneNumber: scene.sceneNumber,
          imageBase64,
          format: "png",
          prompt: promptData.prompt,
          revisedPrompt: dalleData.data?.[0]?.revised_prompt,
        })
      }
    }

    return Response.json({ success: true, images })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error("Image Agent error:", msg)
    return Response.json({ error: msg }, { status: 500 })
  }
}
