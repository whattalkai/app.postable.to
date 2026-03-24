# Tasks

## To Do

<!-- Add new tasks here -->

## In Progress


## Self Review

<!-- Tasks being self-reviewed -->

## In Review

- **#8 Export progress modal** — Added popup dialog that opens on PNG/MP4 export button click. Shows spinner + status message for each step (rendering, encoding, finalizing). MP4 has a live progress bar. Modal stays open during download. Close button disabled while exporting, enabled when done or on error. File: `app/page.tsx`.
- **#6 Fix MP4 export: real H.264 MP4 + broken images** — Replaced MediaRecorder/WebM with Web Codecs API + mp4-muxer. Files output as `.mp4`. Added `--disable-web-security` to Puppeteer + explicit image load wait. Test on `app.postable.to` — download MP4 and verify: (1) file is `.mp4`, (2) images render correctly, (3) starts from frame 0.
- **#7 Fix MP4 export start frame** — Reset all animations to frame 0 before capture. File: `app/api/export/route.ts`. Test: download MP4 on production and verify it starts from the very first frame.

<!-- Tasks confirmed working, waiting for Cemre's approval -->

## Needs Iteration

<!-- Tasks returned with feedback — read notes before redoing -->

## Done

- **#1 Fix AI errors in chat dialogue** — Root cause: the `reelstudio` API key was disabled in the Anthropic console. Re-enabled it — no code changes needed. Confirmed working: chat generates designs, captions, and hashtags successfully.
- **#2 Fix PNG and MP4 file downloads (local)** — Two bugs fixed: (1) anchor element was never appended to the DOM before `.click()`; (2) video renamed from `.mp4` to `.webm`. Works locally — production MP4 still broken (separate task above).
- **#3 Chat input polish** — (1) Placeholder color changed from `#3d3d3d` to `#8e8e8e` (ChatGPT-style visibility). (2) Added `overflowX: hidden` to chat container. (3) Added `word-break: break-word` to message bubbles. File: `app/page.tsx`.
- **#4 Move Studio/Brand workspace dropdown to middle navbar** — Replaced the dropdown menu with Claude-style inline tab buttons centered in the topbar. Studio page shows Studio active (white), Brand page shows Brand active (purple). Removed unused `showNav` state from both pages. Files changed: `app/page.tsx`, `app/brand/page.tsx`.
- **#5 Add Voice Input (Speech-to-Text) to AI Chat in StudioPage** — Mic button with Whisper API, Turkish/English support, tap-to-toggle recording, transcribed text inserted into chat input. Files created: `app/api/transcribe/route.ts`, `lib/services/speechToText.ts`, `lib/hooks/useVoiceInput.ts`, `components/VoiceInputButton.tsx`. Integrated into `app/page.tsx` chat input bar. Requires `OPENAI_API_KEY` env var.
