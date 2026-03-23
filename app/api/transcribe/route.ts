import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured" },
      { status: 500 }
    )
  }

  try {
    const formData = await req.formData()
    const audioFile = formData.get("audio") as File | null
    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 })
    }

    // Forward to OpenAI Whisper API
    const whisperForm = new FormData()
    whisperForm.append("file", audioFile, "recording.webm")
    whisperForm.append("model", "whisper-1")
    // Let Whisper auto-detect language (handles Turkish + English seamlessly)

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: whisperForm,
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error("Whisper API error:", response.status, errText)
      return NextResponse.json(
        { error: "Transcription failed" },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json({ text: data.text })
  } catch (err) {
    console.error("Transcribe route error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
