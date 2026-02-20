# Wallpaper Setter Plan (macOS-first)

## 1) Feasibility Evaluation

- **Wallpaper apply is straightforward on macOS** via `NSWorkspace.setDesktopImageURL(_:for:options:)` (AppKit).
- **Desktop app UX is straightforward** with SwiftUI `WindowGroup` plus AppKit wallpaper APIs.
- **Goals-list wallpaper is feasible** by rendering text into a generated local image, then applying it as wallpaper.
- **No private endpoint is required for desktop wallpaper**; this can be done with standard macOS APIs.
- **Lock screen wallpaper is the exception:** no stable public Apple API; any automation path is OS-version fragile.

## 2) Product Scope (v1)

- Desktop app (primary experience in a standard app window).
- Add/select wallpaper from local files.
- Preview and apply flow with success/error feedback.
- "Goals wallpaper" quick entry:
  - Type goals in desktop app editor.
  - Generate text-emphasized styled wallpaper image locally.
  - Preview then apply.
- Persist wallpaper history + last goals draft.
- History management:
  - Show chronological wallpaper history (like lightweight commit log).
  - Allow delete item or clear history.
  - Always require delete confirmation.

## 3) Recommended Technical Approach

- **Stack:** Native Swift + SwiftUI + AppKit bridge (macOS-first).
- **Why:** Best OS integration, fastest interactions, least friction for wallpaper APIs.
- **Architecture boundary:**
  - `UI layer` (desktop app views, preview, goals editor)
  - `State layer` (selection, apply status, history)
  - `Adapter layer` (wallpaper apply/read APIs, file access)
  - `Renderer layer` (goals text -> image output)

## 4) Alternative Solutions (with trade-offs)

1. **Native SwiftUI desktop app (recommended)**
   - Best UX/perf, easiest access to wallpaper APIs.
   - macOS-only code path.
2. **Tauri desktop app**
   - Web UI iteration speed, lighter than Electron.
   - Still needs Rust/native bridge for wallpaper operations.
3. **Electron app**
   - Fastest if web-heavy team.
   - Highest memory footprint, more plumbing for native behavior.

## 5) UX Flow (v1)

1. Open the app window.
2. Choose:
   - `Apply Image` (from recent/library)
   - `Create Goals Wallpaper`
3. Preview panel shows result.
4. Click `Apply` with immediate feedback.
5. If apply fails, show actionable error + retry option.

## 6) Goals Wallpaper Design (v1)

- Render a local PNG sized to current screen resolution.
- Inputs:
  - Title (optional)
  - Goal lines (1 per line)
  - Theme presets (multiple), all text-forward by default
- Output:
  - Timestamped file in app support folder.
  - Added to recent wallpapers.
- History:
  - Each generated or selected wallpaper becomes a history entry with timestamp + metadata.
  - Restoring from history is the primary recovery pattern (instead of one-click undo).

## 6.1) Lock Screen Strategy

- **v1 default:** desktop wallpaper for all displays.
- **Lock screen support options:**
  1. **Safe mode (recommended):** user manually sets lock screen image; app offers "Open generated file" shortcut.
  2. **Experimental mode:** best-effort script path for specific macOS versions, marked unstable and opt-in.
- Recommendation: ship safe mode first, then add experimental mode behind a clear warning.
- **Current Sequoia behavior (practical):** lock screen usually mirrors desktop wallpaper for the signed-in user session; independent lock-screen control is not a stable/public API path.

## 7) Implementation Milestones

### Milestone A: Foundation (Day 1-2)
- Create desktop app shell.
- Add state store and adapter interfaces.
- Add logging + user-visible error surfaces.

### Milestone B: Wallpaper Apply (Day 2-3)
- Implement apply adapter using `NSWorkspace`.
- Add per-screen handling and options (fit/fill), default apply to all displays.
- Add last-applied persistence.

### Milestone C: Goals Renderer (Day 3-4)
- Implement text-to-image renderer.
- Add goals editor in app window.
- Add preview + apply flow.

### Milestone D: UX Polish + QA (Day 4-5)
- Keyboard navigation.
- Empty/loading/error states.
- History list, restore action, and confirmed delete flows.
- Manual QA checklist + core tests.

## 8) Test Plan (minimum)

- Unit:
  - State transitions for select/preview/apply.
  - Goals parsing and image generation output existence.
- Integration:
  - Adapter success/failure paths.
  - History restore and delete confirmation behavior.
- Manual:
  - Single display and multi-display.
  - Missing file, unsupported format, permission-denied style failures.
  - App relaunch persistence (history and goals draft retained).

## 9) Risks and Mitigations

- **Multi-space / multi-display inconsistencies:** explicitly iterate screens and verify result.
- **Image generation latency:** do rendering off main thread; show loading state.
- **Sandbox/file access constraints (if sandboxed):** store outputs in app container and use user-picked files.
- **Unreadable text on bright wallpapers:** start with solid/gradient presets for goals mode.
- **Lock screen OS drift:** keep lock screen behavior out of critical path or clearly mark experimental support.

## 10) Permissions / Setup Expectations

- Local file access for user-selected wallpapers.
- No network required for core v1.
- If distributed via App Store, we may need stricter sandbox handling choices.
- For personal/internal use, local storage and filesystem access are simpler to support.

## 11) Decisions Captured from You

1. **Distribution:** personal/internal first, possible open-source later.
2. **Runtime model:** desktop app only for v1 (no menu bar).
3. **Goals style:** multiple themes, but text-emphasis is core.
4. **Apply behavior:** default to all displays.
5. **Recovery UX:** history over undo.
6. **History controls:** delete with explicit confirmation.
7. **macOS baseline:** `13+` only.
8. **History size:** unlimited.
9. **Initial themes:** `Minimal Light` and `Minimal Dark`.

## 12) Lock Screen Decision (resolved)

- Lock screen requirement is satisfied by default behavior: set desktop wallpaper for all displays, and let lock screen follow the same image.
- No separate lock-screen automation is required for v1.

## 13) Proposed Next Step

Convert this plan into an execution backlog (`v1 tasks`, acceptance criteria, and file/folder scaffold), then start implementation in vertical slices.
