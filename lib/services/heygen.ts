const HEYGEN_BASE_URL = "https://api.heygen.com/v2"

interface HeyGenScene {
  sceneNumber: number
  audioUrl?: string
  audioBase64?: string
  backgroundImageUrl?: string
  backgroundImageBase64?: string
  dialogue: string
}

interface CreateVideoOptions {
  avatarId: string
  scenes: HeyGenScene[]
  aspectRatio?: "9:16" | "16:9" | "1:1"
  title?: string
  voiceId?: string
  audioBase64?: string
}

interface VideoStatus {
  videoId: string
  status: "pending" | "processing" | "completed" | "failed"
  videoUrl?: string
  thumbnailUrl?: string
  duration?: number
  error?: string
}

function getApiKey(): string {
  const apiKey = process.env.HEYGEN_API_KEY
  if (!apiKey) throw new Error("HEYGEN_API_KEY is not set")
  return apiKey
}

export async function createAvatarVideo(options: CreateVideoOptions): Promise<{ videoId: string }> {
  const apiKey = getApiKey()
  const { avatarId, scenes, aspectRatio = "9:16", title } = options

  // Build HeyGen video generation request
  // Using the "talking photo" or "avatar" approach with audio input
  const videoInputs = scenes.map((scene) => {
    const input: Record<string, unknown> = {
      character: {
        type: "avatar",
        avatar_id: avatarId,
        avatar_style: "normal",
      },
      voice: {
        type: "audio",
        audio_url: scene.audioUrl,
      },
    }

    if (scene.backgroundImageUrl) {
      input.background = {
        type: "image",
        url: scene.backgroundImageUrl,
      }
    }

    return input
  })

  const response = await fetch(`${HEYGEN_BASE_URL}/video/generate`, {
    method: "POST",
    headers: {
      "X-Api-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: title || "Postable Video",
      aspect_ratio: aspectRatio,
      video_inputs: videoInputs,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`HeyGen create video failed (${response.status}): ${error}`)
  }

  const data = await response.json()
  return { videoId: data.data?.video_id || data.video_id }
}

export async function getVideoStatus(videoId: string): Promise<VideoStatus> {
  const apiKey = getApiKey()

  const response = await fetch(
    `${HEYGEN_BASE_URL}/video_status.get?video_id=${videoId}`,
    {
      headers: { "X-Api-Key": apiKey },
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`HeyGen status check failed (${response.status}): ${error}`)
  }

  const data = await response.json()
  const d = data.data || data

  return {
    videoId,
    status: d.status,
    videoUrl: d.video_url,
    thumbnailUrl: d.thumbnail_url,
    duration: d.duration,
    error: d.error,
  }
}

export async function pollVideoUntilReady(
  videoId: string,
  maxWaitMs: number = 600000,
  intervalMs: number = 10000
): Promise<VideoStatus> {
  const start = Date.now()

  while (Date.now() - start < maxWaitMs) {
    const status = await getVideoStatus(videoId)

    if (status.status === "completed") return status
    if (status.status === "failed") throw new Error(`HeyGen video failed: ${status.error}`)

    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }

  throw new Error(`HeyGen video timed out after ${maxWaitMs / 1000}s`)
}

export async function listAvatars(): Promise<{ avatars: { avatar_id: string; avatar_name: string; preview_image_url: string }[] }> {
  const apiKey = getApiKey()

  const response = await fetch(`${HEYGEN_BASE_URL}/avatars`, {
    headers: { "X-Api-Key": apiKey },
  })

  if (!response.ok) {
    throw new Error(`HeyGen list avatars failed (${response.status})`)
  }

  const data = await response.json()
  return { avatars: data.data?.avatars || [] }
}
