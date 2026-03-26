import { fal } from "@fal-ai/client"

function ensureFalConfig() {
  const key = process.env.FAL_KEY
  if (!key) throw new Error("FAL_KEY is not set")
  fal.config({ credentials: key })
}

// ── Avatar Video (HeyGen Avatar IV via fal.ai) ──

interface CreateVideoOptions {
  imageUrl: string // Avatar photo / talking photo
  audioUrl: string // Audio for lip-sync
  talkingStyle?: "stable" | "expressive"
  aspectRatio?: "9:16" | "16:9" | "1:1"
  resolution?: "360p" | "540p" | "720p" | "1080p"
}

interface VideoResult {
  videoUrl: string
  requestId: string
}

export async function createAvatarVideo(options: CreateVideoOptions): Promise<VideoResult> {
  ensureFalConfig()

  const input: Record<string, unknown> = {
    image_url: options.imageUrl,
    audio_url: options.audioUrl,
    talking_style: options.talkingStyle || "expressive",
    aspect_ratio: options.aspectRatio || "9:16",
    resolution: options.resolution || "1080p",
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (fal as any).subscribe("fal-ai/heygen/avatar4/image-to-video", {
    input,
  })

  const data = result.data as { video?: { url: string }; video_url?: string }

  return {
    videoUrl: data.video?.url || data.video_url || "",
    requestId: result.requestId || "",
  }
}

// ── Video Translation (HeyGen via fal.ai) ──

interface TranslateVideoOptions {
  videoUrl: string
  targetLanguage: string // e.g. "tr", "en", "es"
}

export async function translateVideo(options: TranslateVideoOptions): Promise<VideoResult> {
  ensureFalConfig()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (fal as any).subscribe("fal-ai/heygen/translate/video", {
    input: {
      video_url: options.videoUrl,
      target_language: options.targetLanguage,
    },
  })

  const data = result.data as { video?: { url: string }; video_url?: string }

  return {
    videoUrl: data.video?.url || data.video_url || "",
    requestId: result.requestId || "",
  }
}
