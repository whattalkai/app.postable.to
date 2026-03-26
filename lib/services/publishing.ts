// ── Instagram Graph API ──

interface PublishResult {
  platform: string
  status: "published" | "scheduled" | "failed"
  postId?: string
  postUrl?: string
  error?: string
}

interface PublishOptions {
  videoUrl: string
  caption: string
  hashtags?: string[]
  thumbnailUrl?: string
  title?: string
  description?: string
  scheduledTime?: string // ISO 8601
}

export async function publishToInstagram(options: PublishOptions): Promise<PublishResult> {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN
  const igUserId = process.env.INSTAGRAM_USER_ID
  if (!accessToken || !igUserId) {
    return { platform: "instagram", status: "failed", error: "INSTAGRAM_ACCESS_TOKEN or INSTAGRAM_USER_ID not set" }
  }

  try {
    const captionText = options.hashtags
      ? `${options.caption}\n\n${options.hashtags.join(" ")}`
      : options.caption

    // Step 1: Create media container
    const containerRes = await fetch(
      `https://graph.facebook.com/v19.0/${igUserId}/media`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          media_type: "REELS",
          video_url: options.videoUrl,
          caption: captionText,
          access_token: accessToken,
          ...(options.thumbnailUrl && { cover_url: options.thumbnailUrl }),
        }),
      }
    )

    if (!containerRes.ok) {
      const err = await containerRes.text()
      return { platform: "instagram", status: "failed", error: `Container creation failed: ${err}` }
    }

    const { id: containerId } = await containerRes.json()

    // Step 2: Wait for container to be ready (poll status)
    let ready = false
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 5000))
      const statusRes = await fetch(
        `https://graph.facebook.com/v19.0/${containerId}?fields=status_code&access_token=${accessToken}`
      )
      const statusData = await statusRes.json()
      if (statusData.status_code === "FINISHED") { ready = true; break }
      if (statusData.status_code === "ERROR") {
        return { platform: "instagram", status: "failed", error: "Container processing failed" }
      }
    }

    if (!ready) {
      return { platform: "instagram", status: "failed", error: "Container processing timed out" }
    }

    // Step 3: Publish
    const publishRes = await fetch(
      `https://graph.facebook.com/v19.0/${igUserId}/media_publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creation_id: containerId,
          access_token: accessToken,
        }),
      }
    )

    if (!publishRes.ok) {
      const err = await publishRes.text()
      return { platform: "instagram", status: "failed", error: `Publish failed: ${err}` }
    }

    const { id: mediaId } = await publishRes.json()
    return {
      platform: "instagram",
      status: "published",
      postId: mediaId,
      postUrl: `https://www.instagram.com/reel/${mediaId}/`,
    }
  } catch (error) {
    return { platform: "instagram", status: "failed", error: error instanceof Error ? error.message : String(error) }
  }
}

// ── YouTube Data API v3 ──

export async function publishToYouTube(options: PublishOptions): Promise<PublishResult> {
  const apiKey = process.env.YOUTUBE_API_KEY
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN
  const clientId = process.env.YOUTUBE_CLIENT_ID
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET

  if (!refreshToken || !clientId || !clientSecret) {
    return { platform: "youtube", status: "failed", error: "YouTube OAuth credentials not set" }
  }

  try {
    // Step 1: Get fresh access token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    })

    if (!tokenRes.ok) {
      return { platform: "youtube", status: "failed", error: "Failed to refresh YouTube access token" }
    }

    const { access_token: accessToken } = await tokenRes.json()

    // Step 2: Download video to upload
    const videoRes = await fetch(options.videoUrl)
    const videoBlob = await videoRes.blob()

    const isShort = true // 9:16 videos are Shorts
    const titleText = options.title || "Untitled Video"
    const descText = options.description || options.caption || ""
    const tagsText = options.hashtags || []

    // Step 3: Resumable upload — initiate
    const initRes = await fetch(
      `https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Type": "video/mp4",
          "X-Upload-Content-Length": String(videoBlob.size),
        },
        body: JSON.stringify({
          snippet: {
            title: isShort ? `${titleText} #Shorts` : titleText,
            description: descText,
            tags: tagsText,
            categoryId: "22", // People & Blogs
          },
          status: {
            privacyStatus: options.scheduledTime ? "private" : "public",
            ...(options.scheduledTime && { publishAt: options.scheduledTime }),
            selfDeclaredMadeForKids: false,
          },
        }),
      }
    )

    if (!initRes.ok) {
      const err = await initRes.text()
      return { platform: "youtube", status: "failed", error: `Upload init failed: ${err}` }
    }

    const uploadUrl = initRes.headers.get("Location")
    if (!uploadUrl) {
      return { platform: "youtube", status: "failed", error: "No upload URL returned" }
    }

    // Step 4: Upload video data
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": String(videoBlob.size),
      },
      body: videoBlob,
    })

    if (!uploadRes.ok) {
      const err = await uploadRes.text()
      return { platform: "youtube", status: "failed", error: `Upload failed: ${err}` }
    }

    const uploadData = await uploadRes.json()
    const videoId = uploadData.id

    return {
      platform: "youtube",
      status: options.scheduledTime ? "scheduled" : "published",
      postId: videoId,
      postUrl: `https://www.youtube.com/watch?v=${videoId}`,
    }
  } catch (error) {
    return { platform: "youtube", status: "failed", error: error instanceof Error ? error.message : String(error) }
  }
}

// ── TikTok Content Posting API ──

export async function publishToTikTok(options: PublishOptions): Promise<PublishResult> {
  const accessToken = process.env.TIKTOK_ACCESS_TOKEN

  if (!accessToken) {
    return { platform: "tiktok", status: "failed", error: "TIKTOK_ACCESS_TOKEN not set" }
  }

  try {
    const captionText = options.hashtags
      ? `${options.caption} ${options.hashtags.join(" ")}`
      : options.caption

    // Step 1: Initialize video upload
    const initRes = await fetch(
      "https://open.tiktokapis.com/v2/post/publish/video/init/",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
        },
        body: JSON.stringify({
          post_info: {
            title: captionText.slice(0, 150),
            privacy_level: "PUBLIC_TO_EVERYONE",
            disable_duet: false,
            disable_comment: false,
            disable_stitch: false,
          },
          source_info: {
            source: "PULL_FROM_URL",
            video_url: options.videoUrl,
          },
        }),
      }
    )

    if (!initRes.ok) {
      const err = await initRes.text()
      return { platform: "tiktok", status: "failed", error: `TikTok init failed: ${err}` }
    }

    const initData = await initRes.json()
    const publishId = initData.data?.publish_id

    if (!publishId) {
      return { platform: "tiktok", status: "failed", error: "No publish_id returned" }
    }

    // Step 2: Check publish status (TikTok processes async)
    let finalStatus: string = "processing"
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 5000))

      const statusRes = await fetch(
        "https://open.tiktokapis.com/v2/post/publish/status/fetch/",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ publish_id: publishId }),
        }
      )

      if (statusRes.ok) {
        const statusData = await statusRes.json()
        const s = statusData.data?.status
        if (s === "PUBLISH_COMPLETE") {
          finalStatus = "completed"
          break
        }
        if (s === "FAILED") {
          return { platform: "tiktok", status: "failed", error: statusData.data?.fail_reason || "Unknown error" }
        }
      }
    }

    return {
      platform: "tiktok",
      status: finalStatus === "completed" ? "published" : "failed",
      postId: publishId,
      error: finalStatus !== "completed" ? "Processing timed out" : undefined,
    }
  } catch (error) {
    return { platform: "tiktok", status: "failed", error: error instanceof Error ? error.message : String(error) }
  }
}

// ── Unified Publisher ──

export async function publishToAll(
  platforms: ("instagram" | "youtube" | "tiktok")[],
  options: PublishOptions
): Promise<PublishResult[]> {
  const publishers: Record<string, (opts: PublishOptions) => Promise<PublishResult>> = {
    instagram: publishToInstagram,
    youtube: publishToYouTube,
    tiktok: publishToTikTok,
  }

  const results = await Promise.allSettled(
    platforms.map((p) => publishers[p](options))
  )

  return results.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : { platform: platforms[i], status: "failed" as const, error: r.reason?.message || "Unknown error" }
  )
}
