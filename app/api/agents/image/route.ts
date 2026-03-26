import Anthropic from "@anthropic-ai/sdk"
import { IMAGE_PROMPT_AGENT } from "@/lib/agents/content"
import { generateImage } from "@/lib/services/imageGen"

const client = new Anthropic()

export async function POST(req: Request) {
  try {
    const { scenes, brandGuide, style, model } = await req.json()

    if (!scenes || !Array.isArray(scenes) || scenes.length === 0) {
      return Response.json({ error: "scenes array is required" }, { status: 400 })
    }

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

      // Step 2: Generate image via Nano Banana Pro (fal.ai)
      try {
        const result = await generateImage({
          prompt: `${promptData.prompt}. Style: ${promptData.style || "modern professional"}. Clean background suitable for avatar video overlay.`,
          negativePrompt: promptData.negativePrompt,
          imageSize: "portrait_16_9",
          model: model || "nano-banana-pro",
        })

        images.push({
          sceneNumber: scene.sceneNumber,
          imageUrl: result[0]?.imageUrl,
          width: result[0]?.width,
          height: result[0]?.height,
          prompt: promptData.prompt,
        })
      } catch (e) {
        console.error(`Image generation failed for scene ${scene.sceneNumber}:`, e)
        images.push({
          sceneNumber: scene.sceneNumber,
          error: `Image generation failed: ${e instanceof Error ? e.message : String(e)}`,
          prompt: promptData.prompt,
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
