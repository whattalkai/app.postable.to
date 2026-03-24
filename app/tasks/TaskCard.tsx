"use client"

import { useState } from "react"
import { DoneButton } from "./DoneButton"

type Task = {
  id: string
  title: string
  body: string
  iterations: number
}

export function TaskCard({
  task,
  colTitle,
  dotColor,
}: {
  task: Task
  colTitle: string
  dotColor: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        style={{
          background: "#161616",
          border: "1px solid #222",
          borderLeft: `3px solid ${dotColor}`,
          borderRadius: 8,
          padding: "12px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          cursor: "pointer",
          transition: "background 0.12s, border-color 0.12s",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#1c1c1c"; (e.currentTarget as HTMLElement).style.borderColor = "#333" }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#161616"; (e.currentTarget as HTMLElement).style.borderColor = "#222" }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          {task.id && (
            <span style={{
              color: colTitle === "Done" ? "#555" : "#e5e5e5",
              fontSize: 13,
              fontWeight: 600,
              flexShrink: 0,
            }}>
              {task.id}
            </span>
          )}
          <span style={{
            color: colTitle === "Done" ? "#555" : "#e5e5e5",
            fontSize: 13,
            fontWeight: 600,
            lineHeight: 1.4,
            textDecoration: colTitle === "Done" ? "line-through" : "none",
            flex: 1,
          }}>
            {task.title}
          </span>
          {task.iterations > 0 && (
            <span style={{
              fontSize: 9,
              fontWeight: 700,
              color: task.iterations >= 3 ? "#f87171" : task.iterations >= 2 ? "#fbbf24" : "#6b6b6b",
              background: task.iterations >= 3 ? "rgba(248,113,113,0.1)" : task.iterations >= 2 ? "rgba(251,191,36,0.1)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${task.iterations >= 3 ? "rgba(248,113,113,0.2)" : task.iterations >= 2 ? "rgba(251,191,36,0.2)" : "rgba(255,255,255,0.08)"}`,
              borderRadius: 4,
              padding: "1px 5px",
              letterSpacing: "0.03em",
              flexShrink: 0,
            }}>
              ×{task.iterations}
            </span>
          )}
        </div>
        {task.body && (
          <span style={{
            color: "#555",
            fontSize: 11,
            lineHeight: 1.6,
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}>
            {task.body}
          </span>
        )}
        {colTitle === "In Review" && (
          <div onClick={e => e.stopPropagation()}>
            <DoneButton taskTitle={task.id ? `${task.id} ${task.title}` : task.title} />
          </div>
        )}
      </div>

      {/* ══ DETAIL MODAL ══ */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "#141414",
              border: "1px solid #2a2a2a",
              borderRadius: 14,
              width: "100%",
              maxWidth: 600,
              maxHeight: "80vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Modal header */}
            <div style={{
              padding: "18px 22px 14px",
              borderBottom: "1px solid #222",
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  {task.id && (
                    <span style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: dotColor,
                      background: `${dotColor}15`,
                      border: `1px solid ${dotColor}30`,
                      borderRadius: 5,
                      padding: "2px 8px",
                    }}>
                      {task.id}
                    </span>
                  )}
                  <span style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: "#6b6b6b",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 4,
                    padding: "2px 7px",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}>
                    {colTitle}
                  </span>
                  {task.iterations > 0 && (
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: task.iterations >= 3 ? "#f87171" : task.iterations >= 2 ? "#fbbf24" : "#999",
                      background: task.iterations >= 3 ? "rgba(248,113,113,0.1)" : task.iterations >= 2 ? "rgba(251,191,36,0.1)" : "rgba(255,255,255,0.05)",
                      border: `1px solid ${task.iterations >= 3 ? "rgba(248,113,113,0.2)" : task.iterations >= 2 ? "rgba(251,191,36,0.2)" : "rgba(255,255,255,0.1)"}`,
                      borderRadius: 4,
                      padding: "2px 7px",
                    }}>
                      {task.iterations} iteration{task.iterations !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <h2 style={{
                  color: "#e5e5e5",
                  fontSize: 16,
                  fontWeight: 700,
                  margin: 0,
                  lineHeight: 1.4,
                  letterSpacing: "-0.01em",
                }}>
                  {task.title}
                </h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{
                  width: 28, height: 28, borderRadius: 7,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#6b6b6b",
                  cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                  fontSize: 14,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            {/* Modal body */}
            <div style={{
              padding: "18px 22px 22px",
              overflowY: "auto",
              flex: 1,
            }}>
              {task.body ? (
                <div style={{
                  color: "#ccc",
                  fontSize: 13,
                  lineHeight: 1.75,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}>
                  {formatBody(task.body)}
                </div>
              ) : (
                <p style={{ color: "#3d3d3d", fontSize: 13 }}>
                  No details available for this task.
                </p>
              )}

              {colTitle === "In Review" && (
                <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid #222" }} onClick={e => e.stopPropagation()}>
                  <DoneButton taskTitle={task.id ? `${task.id} ${task.title}` : task.title} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/** Render the task body with basic formatting for backticks and line structure */
function formatBody(text: string) {
  // Split on backtick-wrapped segments to render them as code
  const parts = text.split(/(`[^`]+`)/)
  return parts.map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 4,
          padding: "1px 5px",
          fontSize: 12,
          fontFamily: "'Geist Mono', 'SF Mono', monospace",
          color: "#e5e5e5",
        }}>
          {part.slice(1, -1)}
        </code>
      )
    }
    return <span key={i}>{part}</span>
  })
}
