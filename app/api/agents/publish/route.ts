import { publishToAll } from "@/lib/services/publishing"

export const maxDuration = 300 // Publishing can take time due to upload + processing

export async function POST(req: Request) {
  try {
    const { videoUrl, platforms, caption, hashtags, title, description, thumbnailUrl, scheduledTime } = await req.json()

    if (!videoUrl) {
      return Response.json({ error: "videoUrl is required" }, { status: 400 })
    }

    if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return Response.json({ error: "platforms array is required (instagram, youtube, tiktok)" }, { status: 400 })
    }

    const validPlatforms = platforms.filter((p: string) =>
      ["instagram", "youtube", "tiktok"].includes(p)
    ) as ("instagram" | "youtube" | "tiktok")[]

    if (validPlatforms.length === 0) {
      return Response.json({ error: "No valid platforms specified" }, { status: 400 })
    }

    const results = await publishToAll(validPlatforms, {
      videoUrl,
      caption: caption || "",
      hashtags,
      title,
      description,
      thumbnailUrl,
      scheduledTime,
    })

    const allSuccess = results.every((r) => r.status === "published" || r.status === "scheduled")

    return Response.json({
      success: allSuccess,
      results,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error("Publishing Agent error:", msg)
    return Response.json({ error: msg }, { status: 500 })
  }
}
