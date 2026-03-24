# Tasks

## To Do





- **#17 Tasks page chat UI** — Add the same chat UI design from Studio/Brand pages to the left side of the tasks page. Same pill input bar, voice input, typing indicator, message bubbles. Connected to the `/api/tasks-chat` endpoint. The task board stays on the right. After the agent updates TASKS.md, the board should refresh to show changes.

- **#13 Set up Google Login for the project** — Add Google OAuth authentication so users can sign in with their Google account. Set up the auth provider, login/logout flow, session management, and protect relevant pages behind authentication.

- **#19 Test Task 🧪** — Bu bir test görevidir.

<!-- Add new tasks here -->

## In Progress

- **#16 Task Agent API** — Build an API endpoint (`/api/tasks-chat`) that acts as a task management agent. It reads TASKS.md, understands user intent (add task, move task, mark done, add comment), and updates TASKS.md accordingly. Supports Turkish and English. Uses Claude API. The agent should understand: "yeni görev ekle", "mark #9 as done", "#14'e not ekle", "move #16 to in progress", etc.

## Self Review

<!-- Tasks being self-reviewed -->

## In Review

- **#9 HTML design preview must never have scrollbars** — Added `scrolling="no"` and `overflow: hidden` to the iframe, plus `borderRadius: 4` on the wrapper. Preview container fully clips content to 9:16 frame.
- **#10 Add play/replay button to design preview** — Detects when iframe CSS animations finish via `getAnimations()` + `Promise.all(finished)`. Shows a translucent play button overlay. Click reloads the iframe to replay animations.
- **#15 Chat AI responds conversationally** — Edit API now returns JSON with `html` + `message` fields. AI writes a natural, context-aware Turkish response explaining what it changed (e.g. "Mor butonu kaldırdım, geri kalanı aynen duruyor"). Generate success message also improved with edit suggestions. Falls back to old message if AI returns raw HTML. Files: `app/api/edit/route.ts`, `app/page.tsx`.
- **#14 CRITICAL BUG FIX: AI edit can no longer wipe designs** — Root cause: no validation on AI-returned HTML — empty/broken/truncated results were blindly saved, destroying the design. Fix: (1) Server-side safeguard rejects HTML that's missing doctype/body or is <30% of original length, returns original HTML instead. (2) Client-side safeguard also checks length ratio before saving. (3) Prompt now has explicit "NEVER delete the design" instructions. (4) max_tokens increased 8192→16384 to prevent truncation. Files: `app/api/edit/route.ts`, `app/page.tsx`.

- **#18 Task detail dialogue with dev explanation + iteration tracking** — Created `TaskCard` client component. Clicking any task card opens a detail modal showing: full task ID badge (color-matched to column), status badge, title, and the complete dev explanation without truncation. Backtick-wrapped code rendered as styled `<code>` elements. Iteration count parsed from `[iterations: N]` tag in TASKS.md — displayed as a colored badge (gray ×1, yellow ×2, red ×3+) on both the card and modal header. Modal has close button and Mark as Done for In Review tasks. Files: `app/tasks/TaskCard.tsx` (new), `app/tasks/page.tsx`.

<!-- Tasks confirmed working, waiting for Cemre's approval -->

## Done
- **#12 Copy Studio AI chat dialogue to Brand AI chat dialogue** — Replaced Brand page chat with exact Studio chat UI: ChatGPT-style pill input bar, voice input button (VoiceInputButton), typing indicator (bouncing dots), message bubbles with `word-break` and line-break rendering. Files: `app/page.tsx`, `app/brand/page.tsx`.
- **#11 Tasarımlar sidebar: selected item moves to top on prompt** — In `sendMessage()`, active design is moved to index 0 of the designs array before generating/editing. Like Claude Code's conversation ordering.
- **#6 Fix MP4 export: real H.264 MP4 + broken images** — Replaced MediaRecorder/WebM with Web Codecs API + mp4-muxer. Files output as `.mp4`. Added `--disable-web-security` to Puppeteer + explicit image load wait. Test on `app.postable.to` — download MP4 and verify: (1) file is `.mp4`, (2) images render correctly, (3) starts from frame 0.
- **#7 Fix MP4 export start frame** — Iterated: replaced `cancel()+play()` with `pause()+currentTime=0` so `animation-fill-mode:both` keeps elements at their "from" state (opacity:0). Frame 0 is now blank, then animations unpause and content flows in. File: `app/api/export/route.ts`. Test: download MP4 on production and verify frame 0 is blank, then content animates in.
- **#8 Export progress modal** — Added popup dialog that opens on PNG/MP4 export button click. Shows spinner + status message for each step (rendering, encoding, finalizing). MP4 has a live progress bar. Modal stays open during download. Close button disabled while exporting, enabled when done or on error. File: `app/page.tsx`.

- **#1 Fix AI errors in chat dialogue** — Root cause: the `reelstudio` API key was disabled in the Anthropic console. Re-enabled it — no code changes needed. Confirmed working: chat generates designs, captions, and hashtags successfully.
- **#2 Fix PNG and MP4 file downloads (local)** — Two bugs fixed: (1) anchor element was never appended to the DOM before `.click()`; (2) video renamed from `.mp4` to `.webm`. Works locally — production MP4 still broken (separate task above).
- **#3 Chat input polish** — (1) Placeholder color changed from `#3d3d3d` to `#8e8e8e` (ChatGPT-style visibility). (2) Added `overflowX: hidden` to chat container. (3) Added `word-break: break-word` to message bubbles. File: `app/page.tsx`.
- **#4 Move Studio/Brand workspace dropdown to middle navbar** — Replaced the dropdown menu with Claude-style inline tab buttons centered in the topbar. Studio page shows Studio active (white), Brand page shows Brand active (purple). Removed unused `showNav` state from both pages. Files changed: `app/page.tsx`, `app/brand/page.tsx`.
- **#5 Add Voice Input (Speech-to-Text) to AI Chat in StudioPage** — Mic button with Whisper API, Turkish/English support, tap-to-toggle recording, transcribed text inserted into chat input. Files created: `app/api/transcribe/route.ts`, `lib/services/speechToText.ts`, `lib/hooks/useVoiceInput.ts`, `components/VoiceInputButton.tsx`. Integrated into `app/page.tsx` chat input bar. Requires `OPENAI_API_KEY` env var.
