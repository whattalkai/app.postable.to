import fs from "fs"
import path from "path"
import { TasksBoard } from "./TasksBoard"

// Always read fresh data — never cache this page
export const dynamic = "force-dynamic"

type Task = { id: string; title: string; body: string; iterations: number }

type Column = {
  title: string
  tasks: Task[]
  color: string
  dot: string
}

function parseTasks(md: string): Column[] {
  const columns: Column[] = [
    { title: "To Do",           tasks: [], color: "#3d3d3d", dot: "#666" },
    { title: "In Progress",     tasks: [], color: "#1a3a2a", dot: "#3ecf8e" },
    { title: "In Review",       tasks: [], color: "#2a2a1a", dot: "#fbbf24" },
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
      if (m) {
        const raw = m[1].trim()
        const idMatch = raw.match(/^(#\d+)\s+(.+)$/)
        let body = m[2].trim()

        // Parse iteration count from body: [iterations: N]
        let iterations = 0
        const iterMatch = body.match(/\[iterations:\s*(\d+)\]/)
        if (iterMatch) {
          iterations = parseInt(iterMatch[1], 10)
          body = body.replace(/\s*\[iterations:\s*\d+\]/, "").trim()
        }

        col.tasks.push({
          id: idMatch ? idMatch[1] : "",
          title: idMatch ? idMatch[2] : raw,
          body,
          iterations,
        })
      }
    }
  }

  return columns
}

export default function TasksPage() {
  const mdPath = path.join(process.cwd(), "TASKS.md")
  const md = fs.existsSync(mdPath) ? fs.readFileSync(mdPath, "utf-8") : ""
  const columns = parseTasks(md)

  return <TasksBoard columns={columns} />
}
