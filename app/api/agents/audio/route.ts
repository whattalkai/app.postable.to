import { textToSpeech, cloneVoiceAndSpeak } from "@/lib/services/elevenlabs"

export async function POST(req: Request) {
  try {
    const { action, text, scenes, voiceId, model, referenceAudioUrl } = await req.json()

    // Voice cloning mode
    if (action === "clone-voice") {
      if (!referenceAudioUrl || !text) {
        return Response.json({ error: "referenceAudioUrl and text are required for voice cloning" }, { status: 400 })
      }
      const result = await cloneVoiceAndSpeak({ audioUrl: referenceAudioUrl, text })
      return Response.json({ success: true, audioUrl: result.audioUrl })
    }

    // If scenes provided, generate per-scene audio
    if (scenes && Array.isArray(scenes)) {
      const audioSegments = []

      for (const scene of scenes) {
        const result = await textToSpeech({
          text: scene.dialogue,
          voiceId,
          model: model || "eleven-v3",
          referenceAudioUrl,
        })

        audioSegments.push({
          sceneNumber: scene.sceneNumber,
          audioUrl: result.audioUrl,
        })
      }

      // Also generate full audio if text provided
      let fullAudio = null
      if (text) {
        const fullResult = await textToSpeech({
          text,
          voiceId,
          model: model || "eleven-v3",
          referenceAudioUrl,
        })
        fullAudio = { audioUrl: fullResult.audioUrl }
      }

      return Response.json({ success: true, audioSegments, fullAudio })
    }

    // Single text TTS
    if (!text) {
      return Response.json({ error: "text or scenes required" }, { status: 400 })
    }

    const result = await textToSpeech({
      text,
      voiceId,
      model: model || "eleven-v3",
      referenceAudioUrl,
    })

    return Response.json({ success: true, audioUrl: result.audioUrl })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error("Audio Agent error:", msg)
    return Response.json({ error: msg }, { status: 500 })
  }
}
