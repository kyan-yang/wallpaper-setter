# CURRENT WORKINGS
This project is in setup phase. Prioritize foundations that unlock rapid UI iteration.

# Project Context

## Vision
Build a wallpaper setter app with premium UI/UX: fast browsing, delightful previews, and safe one-click wallpaper apply.

## Product Principles
- UX polish is a core requirement, not a nice-to-have.
- Minimize friction: users should get from launch to applied wallpaper in seconds.
- Keep interactions predictable and reversible (preview first, then apply).
- Optimize for perceived speed: instant feedback, skeleton states, non-blocking actions.
- Prefer simple flows over feature bloat.

## UX/UI Standards
- Design for clarity: obvious hierarchy, strong spacing rhythm, consistent typography.
- Keep primary actions persistent and visible (`Preview`, `Apply`, `Undo` when applicable).
- Provide keyboard navigation for core flows (browse, focus, select, apply).
- Include clear loading, empty, and error states for every user-facing surface.
- Respect accessibility baselines: visible focus, sufficient contrast, semantic controls.
- Animate with purpose only (state transitions, confirmation), never decorative noise.

## Technical Direction
- Core experience should include:
  - Wallpaper library/grid view
  - Fast preview flow
  - Safe apply flow with confirmation/feedback
  - Last applied wallpaper memory
- Separate UI state from system/apply logic.
- Keep platform integration behind a thin adapter layer so UI can evolve independently.
- Favor local-first behavior (fast start, resilient without network dependency).
- Build for cross-platform extensibility even if first target is one OS.

# Agent Instructions

## Code Organization Rules
- Use a small number of clearly named top-level folders.
- Keep one source of truth per concern (single state owner, single adapter boundary).
- Co-locate component, styles, and tests when it improves maintainability.
- Extract reusable UI primitives early (buttons, cards, modals, grid items).
- Avoid duplicate utility modules with overlapping purposes.
- **The entire app is Electron** (`electron/`). There is no Swift code. Wallpaper apply uses `osascript`, persistence is JSON via Node.js, goals rendering uses Canvas in the renderer process.
- When migrating or replacing a module, **delete the old code, tests, and scripts immediately**. Never leave dead code behind.

## Workflow Rules
- Start with a short plan for non-trivial changes before editing.
- **Commit incrementally.** Each logical change (feature, fix, cleanup) gets its own commit. Do not batch unrelated changes into one commit.
- Always delegate substantial work to parallel sub-agents instead of doing it only in the primary agent context.
- Break every non-trivial request into small, manageable steps before execution.
- Implement vertical slices where possible (UI + behavior + basic validation together).
- For each feature, define: user action, expected state change, success/failure feedback.
- Prefer incremental PR-sized changes over large rewrites.
- Document decisions when trade-offs are non-obvious.

## Quality Bar
- No silent failures on apply actions; show actionable error messages.
- Avoid broad or silent fallbacks that hide root causes; surface the original error (with context) and prefer explicit failure over guessing a substitute behavior.
- Preserve responsiveness: avoid blocking main thread with heavy image work.
- Validate edge cases: missing file, unsupported format, permission or OS command failure.
- Add/maintain tests for critical paths (selection state, preview flow, apply flow).
- Confirm basic manual QA for each UX-facing change.

## Decision Defaults
- If a decision improves UX consistency and implementation complexity is reasonable, choose consistency.
- If architecture choices conflict, pick the option that keeps UI iteration fastest.
- If uncertain, ship a minimal stable path first, then iterate with measured polish.

## Debugging & Fixing Discipline
- Start from symptoms, not assumptions. Reproduce the exact user-visible failure first and capture the real command/output that fails.
- Validate each critical assumption with a direct check before coding (file format, process behavior, API scope, permissions, runtime environment).
- Prefer narrow experiments over large rewrites. Prove or falsify one hypothesis at a time.
- Treat “it should work” as untrusted until observed in this environment.
- Design fixes around the real failure mode, not a generic abstraction. Keep the first successful fix minimal and explicit.
- Fail loudly with context. Bubble up original stderr/stdout details so users and future agents can diagnose quickly.
- Add a test seam before deep fixes when possible (dependency injection or pure transform helpers). This allows deterministic regression tests.
- Validate fixes twice: automated checks (tests/build) and realistic manual behavior checks for the user flow.
- If the first fix fails, do a short postmortem before the next attempt: what assumption was wrong, what evidence was missing, what to test next.
- Record durable learnings in `AGENTS.md` immediately after resolution so future agents avoid repeating dead ends.

## Root-Cause Prevention
- Primary failure pattern to avoid: assumption-driven fixes. If behavior depends on OS internals, verify with runtime evidence before implementation.
- Never infer scope from API names alone (for example, display-level vs space-level behavior). Confirm actual scope in a live environment.
- Before merging adapter changes, run a minimum validation matrix that matches real usage: single desktop, multiple Spaces, multiple displays, and denied permissions.
- Use representative system artifacts in tests whenever possible. Synthetic fixtures alone are not enough for platform integration code.
- Guard risky integration steps with explicit preflight checks (format compatibility, file existence, command availability) and actionable errors.
- Prefer incremental rollout inside the adapter: add one mechanism, verify, then add the next. Do not stack unverified fixes.
- When a fix fails in production-like use, require a brief written postmortem in the PR/commit notes before attempting the next fix.
