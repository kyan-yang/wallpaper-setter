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

## Workflow Rules
- Start with a short plan for non-trivial changes before editing.
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
