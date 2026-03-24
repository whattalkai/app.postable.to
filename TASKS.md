# Tasks

## To Do









<!-- #23 moved to In Progress -->
<!-- #22 moved to In Review -->


<!-- Add new tasks here -->

## In Progress
- **#24 Fix: Task sayfasında "Mark as Done" butonu gecikmeli taşıyor** — Interview sırasında fark edildi. Task sayfasında bir göreve "Mark as Done" butonuna basıldığında, görev hemen Done sütununa taşınmıyor — belirli bir gecikme sonra taşınıyor. Kullanıcı deneyimi açısından aksiyon anında yansımalı. Optimistic UI update eklenmeli: butona basıldığı anda görev arayüzde Done'a taşınmalı, API isteği arka planda tamamlanmalı.


## Self Review

<!-- Tasks being self-reviewed -->

## In Review

- **#22 Consider moving Task Agent AI chat to a cheaper LLM model** — Switched model from `claude-sonnet-4-6` to `claude-haiku-4-5-20251001` in `app/api/tasks-chat/route.ts`. Both call sites updated (initial call + tool-use loop continuation). Haiku handles simple CRUD operations on TASKS.md at a fraction of Sonnet cost with no quality loss for this use case.

- **#20 Video duration & speed control** — Added `− N sn +` stepper control between PNG and MP4 buttons in the toolbar. Users can set video duration from 1–30 seconds. Default is 6s. Value is sent to the export API as `duration: videoDuration * 1000`. MP4 button tooltip dynamically shows chosen duration. File: `app/page.tsx`.

- **#9 HTML design preview must never have scrollbars** — Added `scrolling="no"` and `overflow: hidden` to the iframe, plus `borderRadius: 4` on the wrapper. Preview container fully clips content to 9:16 frame.
- **#10 Add play/replay button to design preview** — Detects when iframe CSS animations finish via `getAnimations()` + `Promise.all(finished)`. Shows a translucent play button overlay. Click reloads the iframe to replay animations.
- **#15 Chat AI responds conversationally** — Edit API now returns JSON with `html` + `message` fields. AI writes a natural, context-aware Turkish response explaining what it changed (e.g. "Mor butonu kaldırdım, geri kalanı aynen duruyor"). Generate success message also improved with edit suggestions. Falls back to old message if AI returns raw HTML. Files: `app/api/edit/route.ts`, `app/page.tsx`.
- **#14 CRITICAL BUG FIX: AI edit can no longer wipe designs** — Root cause: no validation on AI-returned HTML — empty/broken/truncated results were blindly saved, destroying the design. Fix: (1) Server-side safeguard rejects HTML that's missing doctype/body or is <30% of original length, returns original HTML instead. (2) Client-side safeguard also checks length ratio before saving. (3) Prompt now has explicit "NEVER delete the design" instructions. (4) max_tokens increased 8192→16384 to prevent truncation. Files: `app/api/edit/route.ts`, `app/page.tsx`.

- **#18 Task detail dialogue with dev explanation + iteration tracking** — Created `TaskCard` client component. Clicking any task card opens a detail modal showing: full task ID badge (color-matched to column), status badge, title, and the complete dev explanation without truncation. Backtick-wrapped code rendered as styled `<code>` elements. Iteration count parsed from `[iterations: N]` tag in TASKS.md — displayed as a colored badge (gray ×1, yellow ×2, red ×3+) on both the card and modal header. Modal has close button and Mark as Done for In Review tasks. Files: `app/tasks/TaskCard.tsx` (new), `app/tasks/page.tsx`.



- **#23 Fix Vercel build failures — all deployments failing** — Root cause: Supabase auth migration introduced issues (missing Suspense boundary for useSearchParams, fragile signOut when no session exists). Fixed by commits be28a02 and 51b8868. Google auth redirect URL was also missing in Supabase config (fixed by Cemre). Latest 2 deployments are ● Ready, production (app.postable.to) returns 200. Console clean.

<!-- Tasks confirmed working, waiting for Cemre's approval -->

## Done
- **#13 Set up Google Login for the project** — Added Supabase Auth with Google OAuth. "Google ile Giriş Yap" button on login page, OAuth callback at `/auth/callback`, Supabase client helpers in `lib/supabase/`. Password login kept as fallback. Session management updated to check Supabase session first, then password cookie. **Requires:** Enable Google provider in Supabase dashboard (Authentication → Providers → Google) with Google Client ID/Secret, and add `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` to Vercel env vars. | 💬 Cemre: Supabase Google Login eklendi, credentials da girildi. Sonraki adım ne?
- **#17 Tasks page chat UI** — Added Studio-style chat panel to the left side of the tasks page. Same pill input bar, voice input (VoiceInputButton), typing indicator (bouncing dots), message bubbles. Connected to `/api/tasks-chat` endpoint. Board auto-refreshes via `router.refresh()` when the agent modifies TASKS.md. Chat history persisted in localStorage (`wt_tasks_chat_v1`). Chat panel toggleable via button. Files: `app/tasks/TasksBoard.tsx` (new), `app/tasks/page.tsx` (simplified to Server Component wrapper).
- **#16 Task Agent API** — AI-powered `/api/tasks-chat` endpoint with Claude tool calling. Supports: list, add, move, comment, update, and delete tasks. Turkish + English. Reads/writes TASKS.md (local fs in dev, GitHub API on Vercel). File: `app/api/tasks-chat/route.ts`.
- **#21 Add image button to AI chat dialogues for Brand and Tasks** — Replicated Studio's full image upload UI to both Brand and Tasks chat panels. Added: `+` button (bottom-left of input pill) to attach images, image preview thumbnails (54×54) inside the pill with remove (×) buttons, drag & drop with visual highlight feedback, paste image support (Ctrl+V), image display in chat bubbles (68×68 thumbnails), hidden file input with `image/*` and multi-select. Images are resized to max 1200px and compressed to JPEG 0.85 quality. Each page uses its own accent color for drag highlight (purple for Brand, green for Tasks, teal for Studio). Files: `app/brand/page.tsx`, `app/tasks/TasksBoard.tsx`. [iterations: 1]
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
