import fs from "fs"
import path from "path"
import { DoneButton } from "./DoneButton"

type Column = {
  title: string
  tasks: { title: string; body: string }[]
  color: string
  dot: string
}

function parseTasks(md: string): Column[] {
  const columns: Column[] = [
    { title: "To Do",           tasks: [], color: "#3d3d3d", dot: "#666" },
    { title: "In Progress",     tasks: [], color: "#1a3a2a", dot: "#3ecf8e" },
    { title: "Self Review",     tasks: [], color: "#1a2a3a", dot: "#60a5fa" },
    { title: "In Review",       tasks: [], color: "#2a2a1a", dot: "#fbbf24" },
    { title: "Needs Iteration", tasks: [], color: "#2a1a1a", dot: "#f87171" },
    { title: "Done",            tasks: [], color: "#1a1a1a", dot: "#555" },
  ]

  const sections = md.split(/^## /m).slice(1)
  for (const section of sections) {
    const lines = section.trim().split("\n")
    const heading = lines[0].trim()
    const col = columns.find(c => c.title === heading)
    if (!col) continue

    const taskLines = lines.slice(1).join("\n")
    const taskMatches = taskLines.match(/^- \*\*(.+?)\*\*(.*)$/gm) || []
    for (const match of taskMatches) {
      const m = match.match(/^- \*\*(.+?)\*\*\s*—?\s*(.*)$/)
      if (m) col.tasks.push({ title: m[1].trim(), body: m[2].trim() })
    }
  }

  return columns
}

export default function TasksPage() {
  const mdPath = path.join(process.cwd(), "TASKS.md")
  const md = fs.existsSync(mdPath) ? fs.readFileSync(mdPath, "utf-8") : ""
  const columns = parseTasks(md)

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0d0d0d",
      fontFamily: "'Inter', system-ui, sans-serif",
      padding: "32px",
      boxSizing: "border-box",
    }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 600, margin: 0, letterSpacing: "-0.02em" }}>
          Tasks
        </h1>
        <p style={{ color: "#555", fontSize: 13, margin: "4px 0 0" }}>
          {new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Board */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(6, minmax(200px, 1fr))",
        gap: 12,
        overflowX: "auto",
      }}>
        {columns.map(col => (
          <div key={col.title} style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 200 }}>
            {/* Column header */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              background: "#161616",
              borderRadius: 8,
              border: "1px solid #222",
            }}>
              <span style={{
                width: 8, height: 8, borderRadius: "50%",
                background: col.dot, flexShrink: 0,
                boxShadow: col.dot !== "#555" && col.dot !== "#666" ? `0 0 6px ${col.dot}55` : "none",
              }} />
              <span style={{ color: "#ccc", fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                {col.title}
              </span>
              <span style={{
                marginLeft: "auto",
                background: "#222",
                color: "#666",
                borderRadius: 10,
                fontSize: 11,
                fontWeight: 600,
                padding: "1px 7px",
                minWidth: 18,
                textAlign: "center",
              }}>
                {col.tasks.length}
              </span>
            </div>

            {/* Tasks */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {col.tasks.length === 0 ? (
                <div style={{
                  padding: "20px 12px",
                  borderRadius: 8,
                  border: "1px dashed #222",
                  color: "#333",
                  fontSize: 12,
                  textAlign: "center",
                }}>
                  Empty
                </div>
              ) : (
                col.tasks.map((task, i) => (
                  <div key={i} style={{
                    background: "#161616",
                    border: `1px solid #222`,
                    borderLeft: `3px solid ${col.dot}`,
                    borderRadius: 8,
                    padding: "12px 14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}>
                    <span style={{
                      color: col.title === "Done" ? "#555" : "#e5e5e5",
                      fontSize: 13,
                      fontWeight: 600,
                      lineHeight: 1.4,
                      textDecoration: col.title === "Done" ? "line-through" : "none",
                    }}>
                      {task.title}
                    </span>
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
                    {col.title === "In Review" && (
                      <DoneButton taskTitle={task.title} />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
