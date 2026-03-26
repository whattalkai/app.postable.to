import { fal } from "@fal-ai/client"

// Configure fal with API key from env
function ensureFalConfig() {
  const key = process.env.FAL_KEY
  if (!key) throw new Error("FAL_KEY is not set")
  fal.config({ credentials: key })
}

// ── Text-to-Speech (ElevenLabs via fal.ai) ──

interface TTSOptions {
  text: string
  voiceId?: string
  model?: "eleven-v3" | "multilingual-v2" | "turbo-v2.5"
  referenceAudioUrl?: string // For voice cloning
}

interface TTSResult {
  audioUrl: string
  contentType: string
}

const TTS_MODELS: Record<string, string> = {
  "eleven-v3": "fal-ai/elevenlabs/tts/eleven-v3",
  "multilingual-v2": "fal-ai/elevenlabs/tts/multilingual-v2",
  "turbo-v2.5": "fal-ai/elevenlabs/tts/turbo-v2.5",
}

export async function textToSpeech(options: TTSOptions): Promise<TTSResult> {
  ensureFalConfig()

  const model = TTS_MODELS[options.model || "eleven-v3"]

  const input: Record<string, unknown> = {
    text: options.text,
  }

  if (options.voiceId) {
    input.voice = options.voiceId
  }

  // Voice cloning: pass reference audio
  if (options.referenceAudioUrl) {
    input.reference_audio = options.referenceAudioUrl
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (fal as any).subscribe(model, { input })

  const data = result.data as { audio?: { url: string }; audio_url?: string }

  return {
    audioUrl: data.audio?.url || data.audio_url || "",
    contentType: "audio/mpeg",
  }
}

// ── Voice Cloning (MiniMax via fal.ai) ──

interface VoiceCloneOptions {
  audioUrl: string // 10+ seconds of reference audio
  text: string
}

export async function cloneVoiceAndSpeak(options: VoiceCloneOptions): Promise<TTSResult> {
  ensureFalConfig()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (fal as any).subscribe("fal-ai/minimax/voice-clone", {
    input: {
      reference_audio: options.audioUrl,
      text: options.text,
    },
  })

  const data = result.data as { audio?: { url: string }; audio_url?: string }

  return {
    audioUrl: data.audio?.url || data.audio_url || "",
    contentType: "audio/mpeg",
  }
}
