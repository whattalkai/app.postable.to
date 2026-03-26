import Anthropic from "@anthropic-ai/sdk"
import { CONTENT_AGENT_PROMPT } from "@/lib/agents/content"
import { textToSpeech } from "@/lib/services/elevenlabs"
import { createAvatarVideo, pollVideoUntilReady } from "@/lib/services/heygen"
import { publishToAll } from "@/lib/services/publishing"

const client = new Anthropic()

export const maxDuration = 600 // 10 minutes — full pipeline can take time

interface PipelineRequest {
  topic: string
  language?: string
  targetPlatform?: string
  duration?: number
  brandGuide?: string
  voiceId: string
  avatarId: string
  aspectRatio?: "9:16" | "16:9" | "1:1"
  imageStyle?: string
  publishTo?: ("instagram" | "youtube" | "tiktok")[]
  skipPublish?: boolean
}

export async function POST(req: Request) {
  try {
    const body: PipelineRequest = await req.json()

    if (!body.topic) return Response.json({ error: "topic is required" }, { status: 400 })
    if (!body.voiceId) return Response.json({ error: "voiceId is required" }, { status: 400 })
    if (!body.avatarId) return Response.json({ error: "avatarId is required" }, { status: 400 })

    const lang = body.language || "tr"
    const platform = body.targetPlatform || "instagram"
    const targetDuration = body.duration || 60
    const aspectRatio = body.aspectRatio || "9:16"

    const pipelineResult: Record<string, unknown> = {
      startedAt: new Date().toISOString(),
      stages: {},
    }

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

    pipelineResult.stages = { content: { status: "done", data: content } }
    console.log(`[Pipeline] Content ready: ${content.scenes?.length || 0} scenes`)

    // ═══════════════════════════════════════════
    // STAGE 2: Audio Agent + Image Agent (PARALLEL)
    // ═══════════════════════════════════════════
    console.log("[Pipeline] Stage 2: Audio + Image (parallel)")

    const [audioResult, imageResult] = await Promise.allSettled([
      // Audio: Generate voice for full script
      (async () => {
        const result = await textToSpeech({
          text: content.fullScript,
          voiceId: body.voiceId,
        })
        return {
          audioBase64: result.audioBuffer.toString("base64"),
          contentType: result.contentType,
        }
      })(),

      // Images: Generate per-scene background images
      (async () => {
        const openaiKey = process.env.OPENAI_API_KEY
        if (!openaiKey) return { images: [], skipped: true, reason: "OPENAI_API_KEY not set" }

        const images = []
        for (const scene of content.scenes || []) {
          try {
            const dalleRes = await fetch("https://api.openai.com/v1/images/generations", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${openaiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "dall-e-3",
                prompt: `${scene.visualDescription}. Professional, clean background for avatar video overlay. Portrait 9:16 orientation. ${body.imageStyle || "modern minimal"}`,
                n: 1,
                size: "1024x1792",
                response_format: "url",
              }),
            })

            if (dalleRes.ok) {
              const data = await dalleRes.json()
              images.push({
                sceneNumber: scene.sceneNumber,
                imageUrl: data.data?.[0]?.url,
              })
            }
          } catch (e) {
            console.error(`[Pipeline] Image generation failed for scene ${scene.sceneNumber}:`, e)
          }
        }
        return { images }
      })(),
    ])

    const audio = audioResult.status === "fulfilled" ? audioResult.value : null
    const images = imageResult.status === "fulfilled" ? imageResult.value : null

    if (!audio) {
      return Response.json({
        error: "Audio generation failed",
        details: audioResult.status === "rejected" ? audioResult.reason?.message : "Unknown",
        pipelineResult,
      }, { status: 500 })
    }

    pipelineResult.stages = {
      ...(pipelineResult.stages as object),
      audio: { status: "done" },
      images: { status: images ? "done" : "skipped", count: images?.images?.length || 0 },
    }

    console.log("[Pipeline] Audio + Images ready")

    // ═══════════════════════════════════════════
    // STAGE 3: Avatar Video Agent (HeyGen)
    // ═══════════════════════════════════════════
    console.log("[Pipeline] Stage 3: Avatar Video (HeyGen)")

    // For HeyGen, we send the full audio + avatar
    // The scenes are combined into a single video with the avatar speaking
    const videoScenes = (content.scenes || []).map((scene: { sceneNumber: number; dialogue: string }, index: number) => ({
      sceneNumber: scene.sceneNumber,
      dialogue: scene.dialogue,
      audioBase64: index === 0 ? audio.audioBase64 : undefined, // Full audio on first scene
      backgroundImageUrl: images?.images?.find((img: { sceneNumber: number }) => img.sceneNumber === scene.sceneNumber)?.imageUrl,
    }))

    const videoRequest = await createAvatarVideo({
      avatarId: body.avatarId,
      scenes: videoScenes,
      aspectRatio,
      title: content.title || body.topic,
    })

    console.log(`[Pipeline] HeyGen video created: ${videoRequest.videoId}`)

    // Poll until video is ready
    const videoStatus = await pollVideoUntilReady(videoRequest.videoId, 300000, 15000)

    pipelineResult.stages = {
      ...(pipelineResult.stages as object),
      avatarVideo: {
        status: "done",
        videoId: videoStatus.videoId,
        videoUrl: videoStatus.videoUrl,
        duration: videoStatus.duration,
        thumbnailUrl: videoStatus.thumbnailUrl,
      },
    }

    console.log(`[Pipeline] Video ready: ${videoStatus.videoUrl}`)

    // ═══════════════════════════════════════════
    // STAGE 4: Publishing Agent (optional)
    // ═══════════════════════════════════════════
    if (!body.skipPublish && body.publishTo && body.publishTo.length > 0 && videoStatus.videoUrl) {
      console.log(`[Pipeline] Stage 4: Publishing to ${body.publishTo.join(", ")}`)

      const publishResults = await publishToAll(body.publishTo, {
        videoUrl: videoStatus.videoUrl,
        caption: content.caption || "",
        hashtags: content.hashtags || [],
        title: content.title || body.topic,
        description: content.description || "",
        thumbnailUrl: videoStatus.thumbnailUrl,
      })

      pipelineResult.stages = {
        ...(pipelineResult.stages as object),
        publishing: { status: "done", results: publishResults },
      }

      console.log("[Pipeline] Publishing complete")
    } else {
      pipelineResult.stages = {
        ...(pipelineResult.stages as object),
        publishing: { status: "skipped" },
      }
    }

    pipelineResult.completedAt = new Date().toISOString()

    return Response.json({
      success: true,
      videoUrl: videoStatus.videoUrl,
      thumbnailUrl: videoStatus.thumbnailUrl,
      content: {
        title: content.title,
        caption: content.caption,
        hashtags: content.hashtags,
        description: content.description,
      },
      pipeline: pipelineResult,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error("[Pipeline] Error:", msg)
    return Response.json({ error: msg }, { status: 500 })
  }
}
