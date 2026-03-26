import { createAvatarVideo, getVideoStatus, pollVideoUntilReady, listAvatars } from "@/lib/services/heygen"

export const maxDuration = 300 // 5 minutes for video generation polling

export async function POST(req: Request) {
  try {
    const { action, avatarId, scenes, aspectRatio, title, videoId } = await req.json()

    // List available avatars
    if (action === "list-avatars") {
      const data = await listAvatars()
      return Response.json({ success: true, avatars: data.avatars })
    }

    // Check video status
    if (action === "status" && videoId) {
      const status = await getVideoStatus(videoId)
      return Response.json({ success: true, ...status })
    }

    // Create avatar video
    if (!avatarId) {
      return Response.json({ error: "avatarId is required" }, { status: 400 })
    }

    if (!scenes || !Array.isArray(scenes) || scenes.length === 0) {
      return Response.json({ error: "scenes array is required" }, { status: 400 })
    }

    // Prepare scenes with audio URLs
    // Each scene needs: audioUrl or audioBase64, optionally backgroundImageUrl
    const heygenScenes = scenes.map((scene: {
      sceneNumber: number
      audioUrl?: string
      audioBase64?: string
      backgroundImageUrl?: string
      backgroundImageBase64?: string
      dialogue: string
    }) => ({
      sceneNumber: scene.sceneNumber,
      audioUrl: scene.audioUrl,
      audioBase64: scene.audioBase64,
      backgroundImageUrl: scene.backgroundImageUrl,
      backgroundImageBase64: scene.backgroundImageBase64,
      dialogue: scene.dialogue,
    }))

    const result = await createAvatarVideo({
      avatarId,
      scenes: heygenScenes,
      aspectRatio: aspectRatio || "9:16",
      title: title || "Postable Avatar Video",
    })

    // If client wants to wait for completion (sync mode)
    const { waitForCompletion } = await req.json().catch(() => ({ waitForCompletion: false }))

    if (waitForCompletion) {
      const finalStatus = await pollVideoUntilReady(result.videoId)
      return Response.json({ success: true, ...finalStatus })
    }

    // Return video ID for async polling
    return Response.json({
      success: true,
      videoId: result.videoId,
      status: "processing",
      message: "Video is being generated. Poll /api/agents/avatar-video with action='status' and videoId to check progress.",
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error("Avatar Video Agent error:", msg)
    return Response.json({ error: msg }, { status: 500 })
  }
}
