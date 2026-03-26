import { textToSpeech, getVoices } from "@/lib/services/elevenlabs"

export async function POST(req: Request) {
  try {
    const { action, text, scenes, voiceId, stability, similarityBoost, style } = await req.json()

    // List available voices
    if (action === "list-voices") {
      const data = await getVoices()
      return Response.json({ success: true, voices: data.voices })
    }

    // Generate audio
    if (!voiceId) {
      return Response.json({ error: "voiceId is required" }, { status: 400 })
    }

    const ttsOptions = {
      voiceId,
      stability: stability ?? 0.5,
      similarityBoost: similarityBoost ?? 0.75,
      style: style ?? 0.5,
    }

    // If scenes provided, generate per-scene audio
    if (scenes && Array.isArray(scenes)) {
      const audioSegments = []

      for (const scene of scenes) {
        const result = await textToSpeech({
          ...ttsOptions,
          text: scene.dialogue,
        })

        audioSegments.push({
          sceneNumber: scene.sceneNumber,
          audioBase64: result.audioBuffer.toString("base64"),
          contentType: result.contentType,
        })
      }

      // Also generate full audio if fullScript provided
      let fullAudio = null
      if (text) {
        const fullResult = await textToSpeech({ ...ttsOptions, text })
        fullAudio = {
          audioBase64: fullResult.audioBuffer.toString("base64"),
          contentType: fullResult.contentType,
        }
      }

      return Response.json({ success: true, audioSegments, fullAudio })
    }

    // Single text TTS
    if (!text) {
      return Response.json({ error: "text or scenes required" }, { status: 400 })
    }

    const result = await textToSpeech({ ...ttsOptions, text })

    return new Response(new Uint8Array(result.audioBuffer), {
      headers: {
        "Content-Type": result.contentType,
        "Content-Disposition": 'attachment; filename="speech.mp3"',
      },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error("Audio Agent error:", msg)
    return Response.json({ error: msg }, { status: 500 })
  }
}
