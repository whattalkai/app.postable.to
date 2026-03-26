const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1"

interface TTSOptions {
  text: string
  voiceId: string
  modelId?: string
  stability?: number
  similarityBoost?: number
  style?: number
  speakerBoost?: boolean
}

interface TTSResult {
  audioBuffer: Buffer
  contentType: string
}

export async function textToSpeech(options: TTSOptions): Promise<TTSResult> {
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not set")

  const {
    text,
    voiceId,
    modelId = "eleven_multilingual_v2",
    stability = 0.5,
    similarityBoost = 0.75,
    style = 0.5,
    speakerBoost = true,
  } = options

  const response = await fetch(
    `${ELEVENLABS_BASE_URL}/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: {
          stability,
          similarity_boost: similarityBoost,
          style,
          use_speaker_boost: speakerBoost,
        },
      }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`ElevenLabs TTS failed (${response.status}): ${error}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  return {
    audioBuffer: Buffer.from(arrayBuffer),
    contentType: "audio/mpeg",
  }
}

export async function getVoices(): Promise<{ voices: { voice_id: string; name: string; labels: Record<string, string> }[] }> {
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not set")

  const response = await fetch(`${ELEVENLABS_BASE_URL}/voices`, {
    headers: { "xi-api-key": apiKey },
  })

  if (!response.ok) {
    throw new Error(`ElevenLabs voices failed (${response.status})`)
  }

  return response.json()
}
