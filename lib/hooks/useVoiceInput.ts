import { useState, useRef, useCallback } from "react"
import { transcribeAudio } from "@/lib/services/speechToText"

export type VoiceState = "idle" | "recording" | "processing"

export function useVoiceInput(onTranscript: (text: string) => void) {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle")
  const [error, setError] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
    }
  }, [])

  const startRecording = useCallback(async () => {
    setError(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Prefer webm/opus, fallback to whatever is available
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : ""

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        // Stop all tracks to release the mic
        stream.getTracks().forEach((t) => t.stop())
        streamRef.current = null

        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" })
        chunksRef.current = []

        if (blob.size < 1000) {
          // Too short / empty recording
          setVoiceState("idle")
          setError("Ses kaydı çok kısa, tekrar deneyin")
          return
        }

        setVoiceState("processing")

        try {
          const text = await transcribeAudio(blob)
          onTranscript(text)
          setVoiceState("idle")
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Transkripsiyon başarısız"
          if (msg === "empty") {
            setError("Sesinizi anlayamadık, tekrar deneyin")
          } else {
            setError(msg)
          }
          setVoiceState("idle")
        }
      }

      recorder.onerror = () => {
        stream.getTracks().forEach((t) => t.stop())
        streamRef.current = null
        setError("Kayıt hatası oluştu")
        setVoiceState("idle")
      }

      recorder.start()
      setVoiceState("recording")
    } catch (err) {
      // Permission denied or no mic
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setError("Mikrofon izni gerekli — tarayıcı ayarlarından izin verin")
      } else {
        setError("Mikrofon erişilemiyor")
      }
      setVoiceState("idle")
    }
  }, [onTranscript])

  const toggleRecording = useCallback(() => {
    if (voiceState === "recording") {
      stopRecording()
    } else if (voiceState === "idle") {
      startRecording()
    }
    // If processing, ignore taps
  }, [voiceState, startRecording, stopRecording])

  const clearError = useCallback(() => setError(null), [])

  return { voiceState, error, toggleRecording, clearError }
}
