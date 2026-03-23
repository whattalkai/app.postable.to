export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const formData = new FormData()
  formData.append("audio", audioBlob, "recording.webm")

  const res = await fetch("/api/transcribe", {
    method: "POST",
    body: formData,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Bilinmeyen hata" }))
    throw new Error(err.error || "Transkripsiyon başarısız")
  }

  const data = await res.json()
  if (!data.text || data.text.trim().length === 0) {
    throw new Error("empty")
  }

  return data.text.trim()
}
