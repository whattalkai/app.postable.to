"use server"

import fs from "fs"
import path from "path"
import { revalidatePath } from "next/cache"

const GITHUB_REPO = "whattalkai/app.postable.to"
const GITHUB_BRANCH = "main"
const FILE_PATH = "TASKS.md"

function moveTaskToDone(md: string, taskTitle: string): { newMd: string; found: boolean } {
  const lines = md.split("\n")

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
  if (taskIndex === -1) return { newMd: md, found: false }

  lines.splice(taskIndex, 1)

  const doneIndex = lines.findIndex(l => l.trim() === "## Done")
  if (doneIndex !== -1) {
    lines.splice(doneIndex + 1, 0, taskLine)
  }

  return { newMd: lines.join("\n"), found: true }
}

async function updateViaGitHub(taskTitle: string): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.GITHUB_TOKEN
  if (!token) return { ok: false, error: "GITHUB_TOKEN not configured" }

  const headers = {
    Authorization: `token ${token}`,
    Accept: "application/vnd.github.v3+json",
    "Content-Type": "application/json",
  }

  // Get current file content + sha
  const getRes = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/contents/${FILE_PATH}?ref=${GITHUB_BRANCH}`,
    { headers }
  )
  if (!getRes.ok) return { ok: false, error: "Failed to fetch TASKS.md from GitHub" }

  const fileData = await getRes.json()
  const currentContent = Buffer.from(fileData.content, "base64").toString("utf-8")
  const sha = fileData.sha

  const { newMd, found } = moveTaskToDone(currentContent, taskTitle)
  if (!found) return { ok: false, error: "Task not found in TASKS.md" }

  // Commit the updated file
  const putRes = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/contents/${FILE_PATH}`,
    {
      method: "PUT",
      headers,
      body: JSON.stringify({
        message: `Mark "${taskTitle}" as done`,
        content: Buffer.from(newMd).toString("base64"),
        sha,
        branch: GITHUB_BRANCH,
      }),
    }
  )
  if (!putRes.ok) {
    const err = await putRes.text()
    return { ok: false, error: `GitHub commit failed: ${err}` }
  }

  return { ok: true }
}

export async function markAsDone(taskTitle: string): Promise<{ ok: boolean; error?: string }> {
  // On Vercel production, use GitHub API (filesystem is read-only)
  if (process.env.VERCEL) {
    return updateViaGitHub(taskTitle)
  }

  // Local dev — write directly to filesystem
  try {
    const mdPath = path.join(process.cwd(), "TASKS.md")
    const md = fs.readFileSync(mdPath, "utf-8")

    const { newMd, found } = moveTaskToDone(md, taskTitle)
    if (!found) return { ok: false, error: "Task not found" }

    fs.writeFileSync(mdPath, newMd, "utf-8")
    revalidatePath("/tasks")
    return { ok: true }
  } catch {
    return { ok: false, error: "Failed to update TASKS.md locally" }
  }
}
