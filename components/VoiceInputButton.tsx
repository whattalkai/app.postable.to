"use client"
import { useEffect } from "react"
import { useVoiceInput, type VoiceState } from "@/lib/hooks/useVoiceInput"

// Pulsing animation for recording state
const pulseKeyframes = `
@keyframes micPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5); }
  50% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
}
@keyframes micSpin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`

function MicIcon({ state }: { state: VoiceState }) {
  if (state === "processing") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ animation: "micSpin 1s linear infinite" }}>
        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <rect x="9" y="2" width="6" height="12" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5 10a7 7 0 0 0 14 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="12" y1="17" x2="12" y2="22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="8" y1="22" x2="16" y2="22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

type Props = {
  onTranscript: (text: string) => void
  disabled?: boolean
  onError?: (msg: string) => void
}

export function VoiceInputButton({ onTranscript, disabled, onError }: Props) {
  const { voiceState, error, toggleRecording, clearError } = useVoiceInput(onTranscript)

  useEffect(() => {
    if (error && onError) {
      onError(error)
      clearError()
    }
  }, [error, onError, clearError])

  const isRecording = voiceState === "recording"
  const isProcessing = voiceState === "processing"
  const isActive = isRecording || isProcessing

  return (
    <>
      <style>{pulseKeyframes}</style>
      <button
        type="button"
        onClick={toggleRecording}
        disabled={disabled || isProcessing}
        title={isRecording ? "Kaydı durdur" : isProcessing ? "İşleniyor..." : "Sesle yaz"}
        onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)" }}
        onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent" }}
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: isRecording ? "rgba(239, 68, 68, 0.15)" : "transparent",
          border: "none",
          color: isRecording ? "#ef4444" : isProcessing ? "#f59e0b" : "#b4b4b4",
          cursor: isProcessing ? "wait" : disabled ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          padding: 0,
          transition: "color 0.15s, background 0.15s",
          animation: isRecording ? "micPulse 1.5s ease-in-out infinite" : "none",
          opacity: disabled ? 0.4 : 1,
        }}
      >
        <MicIcon state={voiceState} />
      </button>
    </>
  )
}
