# Tasks

## To Do

<!-- Add new tasks here -->

## In Progress

- **Add Voice Input (Speech-to-Text) to AI Chat in StudioPage** — Mic button with Whisper API, Turkish/English support, tap-to-toggle recording, transcribed text inserted into chat input.
- **Fix MP4 export on production (Vercel)** — Puppeteer can't find Chrome on serverless. Fixing with `@sparticuz/chromium` + `puppeteer-core`.

## Self Review

<!-- Tasks being self-reviewed -->

## In Review

<!-- Tasks confirmed working, waiting for Cemre's approval -->

## Needs Iteration

<!-- Tasks returned with feedback — read notes before redoing -->

## Done

- **Fix PNG and MP4 file downloads (local)** — Two bugs fixed: (1) anchor element was never appended to the DOM before `.click()`; (2) video renamed from `.mp4` to `.webm`. Works locally — production MP4 still broken (separate task above).
