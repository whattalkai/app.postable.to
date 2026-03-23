"use client"

import { useTransition } from "react"
import { markAsDone } from "./actions"

export function DoneButton({ taskTitle }: { taskTitle: string }) {
  const [pending, startTransition] = useTransition()

  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => markAsDone(taskTitle))}
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
  )
}
