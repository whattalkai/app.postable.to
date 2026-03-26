import { createAvatarVideo, translateVideo } from "@/lib/services/heygen"

export const maxDuration = 300

export async function POST(req: Request) {
  try {
    const { action, imageUrl, audioUrl, talkingStyle, aspectRatio, resolution, videoUrl, targetLanguage } = await req.json()

    // Video translation mode
    if (action === "translate") {
      if (!videoUrl || !targetLanguage) {
        return Response.json({ error: "videoUrl and targetLanguage required for translation" }, { status: 400 })
      }
      const result = await translateVideo({ videoUrl, targetLanguage })
      return Response.json({ success: true, videoUrl: result.videoUrl, requestId: result.requestId })
    }

    // Create avatar video
    if (!imageUrl) {
      return Response.json({ error: "imageUrl is required (avatar/talking photo)" }, { status: 400 })
    }
    if (!audioUrl) {
      return Response.json({ error: "audioUrl is required (speech audio)" }, { status: 400 })
    }

    const result = await createAvatarVideo({
      imageUrl,
      audioUrl,
      talkingStyle: talkingStyle || "expressive",
      aspectRatio: aspectRatio || "9:16",
      resolution: resolution || "1080p",
    })

    return Response.json({
      success: true,
      videoUrl: result.videoUrl,
      requestId: result.requestId,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error("Avatar Video Agent error:", msg)
    return Response.json({ error: msg }, { status: 500 })
  }
}
