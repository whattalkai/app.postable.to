"use server"

import fs from "fs"
import path from "path"
import { revalidatePath } from "next/cache"

export async function markAsDone(taskTitle: string) {
  const mdPath = path.join(process.cwd(), "TASKS.md")
  const md = fs.readFileSync(mdPath, "utf-8")
  const lines = md.split("\n")

  // Find the task line
  let taskLine = ""
  let taskIndex = -1
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^- \*\*(.+?)\*\*/)
    if (m && m[1].trim() === taskTitle) {
      taskLine = lines[i]
      taskIndex = i
      break
    }
  }
  if (taskIndex === -1) return

  // Remove from current position
  lines.splice(taskIndex, 1)

  // Insert at top of Done section (after ## Done heading)
  const doneIndex = lines.findIndex(l => l.trim() === "## Done")
  if (doneIndex !== -1) {
    lines.splice(doneIndex + 1, 0, taskLine)
  }

  fs.writeFileSync(mdPath, lines.join("\n"), "utf-8")
  revalidatePath("/tasks")
}
