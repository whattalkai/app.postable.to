# Tasks

## To Do

<!-- Add new tasks here -->

## In Progress

- **Fix AI errors in chat dialogue** — Chat shows 401 authentication errors ("invalid x-api-key"). Investigate API route and fix the auth configuration.
- **Fix MP4 export start frame** — Video starts mid-animation. After `setContent`, animations have already progressed. Fix: reset all animations to frame 0 before capture using `document.getAnimations().forEach(a => { a.cancel(); a.play() })`.


## Self Review

<!-- Tasks being self-reviewed -->

## In Review

- **Move Studio/Brand workspace dropdown to middle navbar** — Replaced the dropdown menu with Claude-style inline tab buttons centered in the topbar. Studio page shows Studio active (white), Brand page shows Brand active (purple). Removed unused `showNav` state from both pages. Files changed: `app/page.tsx`, `app/brand/page.tsx`.
- **Add Voice Input (Speech-to-Text) to AI Chat in StudioPage** — Mic button with Whisper API, Turkish/English support, tap-to-toggle recording, transcribed text inserted into chat input. Files created: `app/api/transcribe/route.ts`, `lib/services/speechToText.ts`, `lib/hooks/useVoiceInput.ts`, `components/VoiceInputButton.tsx`. Integrated into `app/page.tsx` chat input bar. Requires `OPENAI_API_KEY` env var.

<!-- Tasks confirmed working, waiting for Cemre's approval -->

## Needs Iteration

<!-- Tasks returned with feedback — read notes before redoing -->

## Done

- **Fix PNG and MP4 file downloads (local)** — Two bugs fixed: (1) anchor element was never appended to the DOM before `.click()`; (2) video renamed from `.mp4` to `.webm`. Works locally — production MP4 still broken (separate task above).
