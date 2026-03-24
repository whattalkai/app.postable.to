@AGENTS.md

## Autonomy — Cemre's Standing Authorization
- Cemre is a business owner, not a coder. Do NOT ask for permission on routine development actions.
- You are fully authorized to: read files, edit files, run dev servers, install packages, run builds, run git commands (add, commit, push), create branches, deploy, and execute any CLI command needed to complete the task.
- Never pop up confirmations for file edits, git operations, bash commands, or deployments. Just do it.
- Only ask Cemre when there is a genuine product/design decision that requires his input (e.g. "should this be a modal or a page?"), NOT for technical execution steps.

## Project Rules
- At the start of every session, read TASKS.md
- Never use assumptions — if something is unclear, ask Cemre before proceeding
- Only make changes relevant to the current task — do not refactor or touch unrelated code
- Only mark a task as **Done** when Cemre explicitly says so (e.g. "mark as done", "move to done")

## Task Management
- Pick tasks from **To Do**, move to **In Progress** while working
- Never skip a stage — always move through stages in strict order
## Task Stages — Strict Order
1. **To Do** — waiting to be picked up
2. **In Progress** — actively working on it
3. **Self Review** — testing and visual confirmation (see rules below)
4. **In Review** — confirmed working, **auto-push to GitHub** (Vercel auto-deploys), waiting for Cemre to test on production
5. **Done** — Cemre explicitly approved it (only mark Done when Cemre says so)

## Self Review is Mandatory
- Self Review is not optional and cannot be skipped
- When entering Self Review, explicitly state: "Now entering Self Review"
- Run the dev server
- Navigate to the relevant page
- Actually interact with what changed (click the button, submit the form, test the exact scenario described in the task)
- Check browser console for errors — console must be clean
- Take a screenshot of the relevant UI
- Compare the screenshot against the original task description — does it look like what Cemre asked for?
- Ask yourself: does this meet the visual and functional expectation expressed in the task?
- If the UI looks wrong, incomplete, or different from what was asked — go back to **In Progress**
- If console has errors — go back to **In Progress**
- Only move to **In Review** after both conditions are true: console is clean AND UI matches the task expectation
- When moving to **In Review**, attach the screenshot so Cemre can immediately see what was built
- **Auto-deploy on In Review**: When moving a task to In Review, automatically commit and push to GitHub (which triggers Vercel deploy). Cemre reviews on production, not localhost.

## Status Updates
After every single message, always end with this block:
---
📍 **Stage:** [current stage name]
✅ **Just did:** [one line summary]
⏭️ **Next:** [what happens next]
---
