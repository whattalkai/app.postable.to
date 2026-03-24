"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { markAsDone } from "./actions"

export function DoneButton({ taskTitle, onOptimisticDone }: { taskTitle: string; onOptimisticDone?: (taskKey: string) => void }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const router = useRouter()

  const handleClick = () => {
    setError(null)
    // Move card immediately in UI, API call runs in background
    onOptimisticDone?.(taskTitle)
    startTransition(async () => {
      const result = await markAsDone(taskTitle)
      if (result.ok) {
        setDone(true)
        router.refresh()
      } else {
        setError(result.error ?? "Failed to move task")
      }
    })
  }

  if (done) {
    return (
      <span style={{ color: "#3ecf8e", fontSize: 11, fontWeight: 600, marginTop: 6 }}>
        Moved to Done
      </span>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <button
        disabled={pending}
        onClick={handleClick}
        style={{
          marginTop: 6,
          padding: "5px 10px",
          background: pending ? "#1a2a1a" : "#0f2a0f",
          color: pending ? "#3a7a3a" : "#3ecf8e",
          border: "1px solid #1a4a1a",
          borderRadius: 6,
          fontSize: 11,
          fontWeight: 600,
          cursor: pending ? "not-allowed" : "pointer",
          letterSpacing: "0.02em",
          alignSelf: "flex-start",
          transition: "all 0.15s",
        }}
      >
        {pending ? "Moving…" : "✓ Mark as Done"}
      </button>
      {error && (
        <span style={{ color: "#f87171", fontSize: 10, marginTop: 2 }}>
          {error}
        </span>
      )}
    </div>
  )
}
