import Anthropic from "@anthropic-ai/sdk"
import fs from "fs"
import path from "path"

const client = new Anthropic()

const GITHUB_REPO = "whattalkai/app.postable.to"
const GITHUB_BRANCH = "main"
const FILE_PATH = "TASKS.md"

// ── Read TASKS.md ──
async function readTasksMd(): Promise<string> {
  if (process.env.VERCEL) {
    const token = process.env.GITHUB_TOKEN
    if (!token) throw new Error("GITHUB_TOKEN not configured")
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${FILE_PATH}?ref=${GITHUB_BRANCH}`,
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    )
    if (!res.ok) throw new Error("Failed to fetch TASKS.md from GitHub")
    const data = await res.json()
    return Buffer.from(data.content, "base64").toString("utf-8")
  }
  return fs.readFileSync(path.join(process.cwd(), "TASKS.md"), "utf-8")
}

// ── Write TASKS.md ──
async function writeTasksMd(content: string): Promise<void> {
  if (process.env.VERCEL) {
    const token = process.env.GITHUB_TOKEN
    if (!token) throw new Error("GITHUB_TOKEN not configured")
    const headers = {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    }
    // Get sha
    const getRes = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${FILE_PATH}?ref=${GITHUB_BRANCH}`,
      { headers }
    )
    if (!getRes.ok) throw new Error("Failed to fetch TASKS.md sha")
    const fileData = await getRes.json()
    // Commit
    const putRes = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${FILE_PATH}`,
      {
        method: "PUT",
        headers,
        body: JSON.stringify({
          message: "Task agent: update TASKS.md",
          content: Buffer.from(content).toString("base64"),
          sha: fileData.sha,
          branch: GITHUB_BRANCH,
        }),
      }
    )
    if (!putRes.ok) throw new Error("GitHub commit failed")
    return
  }
  fs.writeFileSync(path.join(process.cwd(), "TASKS.md"), content, "utf-8")
}

// ── Find next task ID ──
function getNextTaskId(md: string): number {
  const matches = md.match(/#(\d+)\s/g)
  if (!matches) return 1
  const ids = matches.map(m => parseInt(m.replace("#", "").trim()))
  return Math.max(...ids) + 1
}

// ── Tool implementations ──
function listTasks(md: string): string {
  const sections = md.split(/^## /m).slice(1)
  const result: string[] = []
  for (const section of sections) {
    const lines = section.trim().split("\n")
    const heading = lines[0].trim()
    const taskMatches = lines.slice(1).join("\n").match(/^- \*\*(.+?)\*\*\s*—?\s*(.*)$/gm) || []
    if (taskMatches.length > 0) {
      result.push(`\n**${heading}** (${taskMatches.length}):`)
      for (const match of taskMatches) {
        const m = match.match(/^- \*\*(.+?)\*\*\s*—?\s*(.*)$/)
        if (m) result.push(`  - ${m[1].trim()}${m[2] ? ` — ${m[2].trim().slice(0, 80)}...` : ""}`)
      }
    } else {
      result.push(`\n**${heading}** (0): boş`)
    }
  }
  return result.join("\n")
}

function addTask(md: string, title: string, description: string): string {
  const nextId = getNextTaskId(md)
  const taskLine = `- **#${nextId} ${title}** — ${description}`
  return md.replace("<!-- Add new tasks here -->", `${taskLine}\n\n<!-- Add new tasks here -->`)
}

function moveTask(md: string, taskId: string, targetSection: string): { newMd: string; found: boolean } {
  const lines = md.split("\n")
  const pattern = new RegExp(`^- \\*\\*${taskId.replace("#", "\\#")}\\s`)

  let taskLine = ""
  let taskIndex = -1
  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i])) {
      taskLine = lines[i]
      taskIndex = i
      break
    }
  }
  if (taskIndex === -1) return { newMd: md, found: false }

  lines.splice(taskIndex, 1)

  const sectionIndex = lines.findIndex(l => l.trim() === `## ${targetSection}`)
  if (sectionIndex === -1) return { newMd: md, found: false }

  lines.splice(sectionIndex + 1, 0, taskLine)
  return { newMd: lines.join("\n"), found: true }
}

function addComment(md: string, taskId: string, comment: string): { newMd: string; found: boolean } {
  const lines = md.split("\n")
  const pattern = new RegExp(`^- \\*\\*${taskId.replace("#", "\\#")}\\s`)

  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i])) {
      // Append comment to the task description
      lines[i] = lines[i].replace(/\s*$/, ` | 💬 ${comment}`)
      return { newMd: lines.join("\n"), found: true }
    }
  }
  return { newMd: md, found: false }
}

function updateTaskDescription(md: string, taskId: string, newDescription: string): { newMd: string; found: boolean } {
  const lines = md.split("\n")
  const pattern = new RegExp(`^- \\*\\*(${taskId.replace("#", "\\#")}\\s.+?)\\*\\*`)

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(pattern)
    if (m) {
      lines[i] = `- **${m[1]}** — ${newDescription}`
      return { newMd: lines.join("\n"), found: true }
    }
  }
  return { newMd: md, found: false }
}

function deleteTask(md: string, taskId: string): { newMd: string; found: boolean } {
  const lines = md.split("\n")
  const pattern = new RegExp(`^- \\*\\*${taskId.replace("#", "\\#")}\\s`)

  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i])) {
      lines.splice(i, 1)
      return { newMd: lines.join("\n"), found: true }
    }
  }
  return { newMd: md, found: false }
}

// ── Tool definitions for Claude ──
const tools: Anthropic.Tool[] = [
  {
    name: "list_tasks",
    description: "Tüm görevleri listele. Her sütundaki görevleri gösterir: To Do, In Progress, In Review, Done.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "add_task",
    description: "Yeni görev ekle. To Do sütununa eklenir.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "Görev başlığı (kısa, açıklayıcı)" },
        description: { type: "string", description: "Görev açıklaması (ne yapılacak, detaylar)" },
      },
      required: ["title", "description"],
    },
  },
  {
    name: "move_task",
    description: "Bir görevi başka sütuna taşı. Sütunlar: To Do, In Progress, In Review, Done.",
    input_schema: {
      type: "object" as const,
      properties: {
        task_id: { type: "string", description: "Görev ID'si, örn: #9, #14" },
        target: {
          type: "string",
          description: "Hedef sütun: 'To Do', 'In Progress', 'In Review', veya 'Done'",
          enum: ["To Do", "In Progress", "In Review", "Done"],
        },
      },
      required: ["task_id", "target"],
    },
  },
  {
    name: "add_comment",
    description: "Bir göreve yorum/not ekle.",
    input_schema: {
      type: "object" as const,
      properties: {
        task_id: { type: "string", description: "Görev ID'si, örn: #9, #14" },
        comment: { type: "string", description: "Eklenecek yorum" },
      },
      required: ["task_id", "comment"],
    },
  },
  {
    name: "update_task",
    description: "Bir görevin açıklamasını güncelle.",
    input_schema: {
      type: "object" as const,
      properties: {
        task_id: { type: "string", description: "Görev ID'si, örn: #9, #14" },
        description: { type: "string", description: "Yeni açıklama" },
      },
      required: ["task_id", "description"],
    },
  },
  {
    name: "delete_task",
    description: "Bir görevi tamamen sil. Dikkat: geri alınamaz. Sadece kullanıcı açıkça silmek istediğinde kullan.",
    input_schema: {
      type: "object" as const,
      properties: {
        task_id: { type: "string", description: "Görev ID'si, örn: #9, #14" },
      },
      required: ["task_id"],
    },
  },
]

const SYSTEM_PROMPT = `Sen WhatTalk.ai projesinin görev yönetim asistanısın.
Kullanıcı (Cemre) sana Türkçe veya İngilizce görev yönetimi komutları verecek.

Görev aşamaları:
1. To Do — yapılacaklar
2. In Progress — üzerinde çalışılıyor
3. In Review — tamamlandı, Cemre'nin onayı bekleniyor
4. Done — Cemre onayladı

Kurallar:
- Her zaman önce list_tasks ile mevcut durumu kontrol et
- Kullanıcının niyetini anla ve doğru tool'u kullan
- Türkçe ve İngilizce komutları anla: "yeni görev ekle", "add task", "#9'u done yap", "mark #9 as done", "#14'e not ekle", "add note to #14"
- Kısa, doğal ve sıcak yanıtlar ver
- Emoji kullan ama abartma
- Eğer belirsizlik varsa, kullanıcıya sor
- "done yap", "bitti", "tamam", "onaylandı" gibi ifadeler = Done'a taşı
- "başla", "üzerine al", "çalışmaya başla" = In Progress'e taşı
- Task ID'leri her zaman # ile başlar: #1, #9, #14 vb.`

export async function POST(req: Request) {
  try {
    const { message, history } = await req.json()

    if (!message) {
      return Response.json({ error: "Mesaj gerekli" }, { status: 400 })
    }

    // Build conversation messages
    const messages: Anthropic.MessageParam[] = []

    // Add history if provided
    if (history && Array.isArray(history)) {
      for (const msg of history) {
        messages.push({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        })
      }
    }

    // Add current message
    messages.push({ role: "user", content: message })

    // Initial AI call
    let response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      tools,
      messages,
    })

    // Tool use loop
    let md = await readTasksMd()
    let modified = false
    const toolResults: string[] = []

    while (response.stop_reason === "tool_use") {
      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      )

      const toolResultContents: Anthropic.ToolResultBlockParam[] = []

      for (const toolUse of toolUseBlocks) {
        let result = ""
        const input = toolUse.input as Record<string, string>

        switch (toolUse.name) {
          case "list_tasks":
            result = listTasks(md)
            break

          case "add_task":
            md = addTask(md, input.title, input.description)
            modified = true
            result = `✅ Görev eklendi: ${input.title}`
            break

          case "move_task": {
            const moveResult = moveTask(md, input.task_id, input.target)
            if (moveResult.found) {
              md = moveResult.newMd
              modified = true
              result = `✅ ${input.task_id} → ${input.target}`
            } else {
              result = `❌ Görev bulunamadı: ${input.task_id}`
            }
            break
          }

          case "add_comment": {
            const commentResult = addComment(md, input.task_id, input.comment)
            if (commentResult.found) {
              md = commentResult.newMd
              modified = true
              result = `✅ Yorum eklendi: ${input.task_id}`
            } else {
              result = `❌ Görev bulunamadı: ${input.task_id}`
            }
            break
          }

          case "update_task": {
            const updateResult = updateTaskDescription(md, input.task_id, input.description)
            if (updateResult.found) {
              md = updateResult.newMd
              modified = true
              result = `✅ Açıklama güncellendi: ${input.task_id}`
            } else {
              result = `❌ Görev bulunamadı: ${input.task_id}`
            }
            break
          }

          case "delete_task": {
            const deleteResult = deleteTask(md, input.task_id)
            if (deleteResult.found) {
              md = deleteResult.newMd
              modified = true
              result = `✅ Görev silindi: ${input.task_id}`
            } else {
              result = `❌ Görev bulunamadı: ${input.task_id}`
            }
            break
          }

          default:
            result = `Bilinmeyen tool: ${toolUse.name}`
        }

        toolResults.push(result)
        toolResultContents.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: result,
        })
      }

      // Continue conversation with tool results
      messages.push({ role: "assistant", content: response.content })
      messages.push({ role: "user", content: toolResultContents })

      response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        tools,
        messages,
      })
    }

    // Save changes if modified
    if (modified) {
      await writeTasksMd(md)
    }

    // Extract final text
    const textBlock = response.content.find(
      (b): b is Anthropic.TextBlock => b.type === "text"
    )
    const reply = textBlock?.text || "İşlem tamamlandı."

    return Response.json({
      reply,
      modified,
      toolResults,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error("Tasks chat error:", msg)
    return Response.json({ error: msg }, { status: 500 })
  }
}
