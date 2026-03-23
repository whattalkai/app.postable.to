# Tasks

## To Do

- **Move Studio/Brand workspace dropdown to middle navbar** — Currently the workspace selector (Studio, Brand) is in a dropdown on the left side. Move it to the middle/center navbar area, similar to Claude's tab-style design (like the Chat/Cowork/Code tabs in the screenshot). Should look like inline tab buttons rather than a dropdown menu.

<!-- Add new tasks here -->

## In Progress

- **Fix MP4/PNG export on production (Vercel)** — `@sparticuz/chromium` binary gets stripped at deploy time. Switching to `@sparticuz/chromium-min` which downloads from a URL at runtime.

## Self Review

<!-- Tasks being self-reviewed -->

## In Review

- **Add Voice Input (Speech-to-Text) to AI Chat in StudioPage** — Mic button with Whisper API, Turkish/English support, tap-to-toggle recording, transcribed text inserted into chat input. Files created: `app/api/transcribe/route.ts`, `lib/services/speechToText.ts`, `lib/hooks/useVoiceInput.ts`, `components/VoiceInputButton.tsx`. Integrated into `app/page.tsx` chat input bar. Requires `OPENAI_API_KEY` env var.

<!-- Tasks confirmed working, waiting for Cemre's approval -->

## Needs Iteration

<!-- Tasks returned with feedback — read notes before redoing -->

## Done

- **Fix PNG and MP4 file downloads (local)** — Two bugs fixed: (1) anchor element was never appended to the DOM before `.click()`; (2) video renamed from `.mp4` to `.webm`. Works locally — production MP4 still broken (separate task above).
