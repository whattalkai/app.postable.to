import Anthropic from "@anthropic-ai/sdk"
import { CONTENT_AGENT_PROMPT } from "@/lib/agents/content"
import { textToSpeech } from "@/lib/services/elevenlabs"
import { generateImage } from "@/lib/services/imageGen"
import { createAvatarVideo } from "@/lib/services/heygen"
import { publishToAll } from "@/lib/services/publishing"

const client = new Anthropic()

export const maxDuration = 600 // 10 minutes — full pipeline can take time

interface PipelineRequest {
  topic: string
  language?: string
  targetPlatform?: string
  duration?: number
  brandGuide?: string
  voiceId?: string
  referenceAudioUrl?: string // For voice cloning
  avatarImageUrl: string // Avatar photo for HeyGen
  aspectRatio?: "9:16" | "16:9" | "1:1"
  imageModel?: "nano-banana-pro" | "nano-banana-2" | "nano-banana" | "flux-dev"
  ttsModel?: "eleven-v3" | "multilingual-v2" | "turbo-v2.5"
  publishTo?: ("instagram" | "youtube" | "tiktok")[]
  skipPublish?: boolean
}

export async function POST(req: Request) {
  try {
    const body: PipelineRequest = await req.json()

    if (!body.topic) return Response.json({ error: "topic is required" }, { status: 400 })
    if (!body.avatarImageUrl) return Response.json({ error: "avatarImageUrl is required (avatar photo for video)" }, { status: 400 })

    const lang = body.language || "tr"
    const platform = body.targetPlatform || "instagram"
    const targetDuration = body.duration || 60

    const stages: Record<string, unknown> = {}

    // ═══════════════════════════════════════════
    // STAGE 1: Content Agent — Generate script
    // ═══════════════════════════════════════════
    console.log("[Pipeline] Stage 1: Content Agent")

    const brandContext = body.brandGuide ? `\n\nMarka Rehberi:\n${body.brandGuide}` : ""

    const contentResponse = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: CONTENT_AGENT_PROMPT + brandContext,
      messages: [
        {
          role: "user",
          content: `Konu: ${body.topic}\nPlatform: ${platform}\nHedef süre: ${targetDuration} saniye\nDil: ${lang}\n\nBu konuda bir video senaryosu üret.`,
        },
      ],
    })

    const contentRaw = contentResponse.content[0].type === "text" ? contentResponse.content[0].text.trim() : "{}"
    const contentClean = contentRaw.replace(/^```json\n?/, "").replace(/^```\n?/, "").replace(/```$/, "").trim()
    const content = JSON.parse(contentClean)

    stages.content = { status: "done", scenes: content.scenes?.length || 0 }
    console.log(`[Pipeline] Content ready: ${content.scenes?.length || 0} scenes`)

    // ═══════════════════════════════════════════
    // STAGE 2: Audio Agent + Image Agent (PARALLEL)
    // ═══════════════════════════════════════════
    console.log("[Pipeline] Stage 2: Audio + Image (parallel)")

    const [audioResult, imageResult] = await Promise.allSettled([
      // Audio: Generate voice for full script via fal.ai ElevenLabs
      textToSpeech({
        text: content.fullScript,
        voiceId: body.voiceId,
        model: body.ttsModel || "eleven-v3",
        referenceAudioUrl: body.referenceAudioUrl,
      }),

      // Images: Generate per-scene backgrounds via fal.ai Nano Banana Pro
      (async () => {
        const images = []
        for (const scene of content.scenes || []) {
          try {
            const result = await generateImage({
              prompt: `${scene.visualDescription}. Professional, clean background for avatar video overlay. Portrait 9:16 orientation.`,
              imageSize: "portrait_16_9",
              model: body.imageModel || "nano-banana-pro",
            })
            images.push({
              sceneNumber: scene.sceneNumber,
              imageUrl: result[0]?.imageUrl,
            })
          } catch (e) {
            console.error(`[Pipeline] Image failed for scene ${scene.sceneNumber}:`, e)
          }
        }
        return images
      })(),
    ])

    const audio = audioResult.status === "fulfilled" ? audioResult.value : null
    const images = imageResult.status === "fulfilled" ? imageResult.value : []

    if (!audio) {
      return Response.json({
        error: "Audio generation failed",
        details: audioResult.status === "rejected" ? audioResult.reason?.message : "Unknown",
        stages,
      }, { status: 500 })
    }

    stages.audio = { status: "done", audioUrl: audio.audioUrl }
    stages.images = { status: "done", count: images.length }
    console.log("[Pipeline] Audio + Images ready")

    // ═══════════════════════════════════════════
    // STAGE 3: Avatar Video Agent (HeyGen via fal.ai)
    // ═══════════════════════════════════════════
    console.log("[Pipeline] Stage 3: Avatar Video (HeyGen via fal.ai)")

    const video = await createAvatarVideo({
      imageUrl: body.avatarImageUrl,
      audioUrl: audio.audioUrl,
      talkingStyle: "expressive",
      aspectRatio: body.aspectRatio || "9:16",
      resolution: "1080p",
    })

    stages.avatarVideo = { status: "done", videoUrl: video.videoUrl }
    console.log(`[Pipeline] Video ready: ${video.videoUrl}`)

    // ═══════════════════════════════════════════
    // STAGE 4: Publishing Agent (optional)
    // ═══════════════════════════════════════════
    if (!body.skipPublish && body.publishTo && body.publishTo.length > 0 && video.videoUrl) {
      console.log(`[Pipeline] Stage 4: Publishing to ${body.publishTo.join(", ")}`)

      const publishResults = await publishToAll(body.publishTo, {
        videoUrl: video.videoUrl,
        caption: content.caption || "",
        hashtags: content.hashtags || [],
        title: content.title || body.topic,
        description: content.description || "",
      })

      stages.publishing = { status: "done", results: publishResults }
      console.log("[Pipeline] Publishing complete")
    } else {
      stages.publishing = { status: "skipped" }
    }

    return Response.json({
      success: true,
      videoUrl: video.videoUrl,
      content: {
        title: content.title,
        caption: content.caption,
        hashtags: content.hashtags,
        description: content.description,
        fullScript: content.fullScript,
        scenes: content.scenes,
      },
      stages,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error("[Pipeline] Error:", msg)
    return Response.json({ error: msg }, { status: 500 })
  }
}
