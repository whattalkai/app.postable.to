# Tasks

## To Do

<!-- Add new tasks here -->

## In Progress

## Self Review

<!-- Tasks being self-reviewed -->

## In Review

- **Add Voice Input (Speech-to-Text) to AI Chat in StudioPage** — Mic button with Whisper API, Turkish/English support, tap-to-toggle recording, transcribed text inserted into chat input. Files created: `app/api/transcribe/route.ts`, `lib/services/speechToText.ts`, `lib/hooks/useVoiceInput.ts`, `components/VoiceInputButton.tsx`. Integrated into `app/page.tsx` chat input bar. Requires `OPENAI_API_KEY` env var.
- **Fix MP4 export on production (Vercel)** — Replaced `puppeteer` with `puppeteer-core` + `@sparticuz/chromium`. Local export API returns 200. Files changed: `app/api/export/route.ts`, `next.config.ts`, `package.json`. Needs Cemre to test MP4 download on `app.postable.to` after Vercel deploys.

<!-- Tasks confirmed working, waiting for Cemre's approval -->

## Needs Iteration

<!-- Tasks returned with feedback — read notes before redoing -->

## Done

- **Fix PNG and MP4 file downloads (local)** — Two bugs fixed: (1) anchor element was never appended to the DOM before `.click()`; (2) video renamed from `.mp4` to `.webm`. Works locally — production MP4 still broken (separate task above).
