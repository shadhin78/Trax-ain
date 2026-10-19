# Project-X / X-29 — Persistent Architectural Memory (MEMORY.md)

> **Status:** Active Knowledge Base & Historical Decision Registry  
> **Purpose:** Preserve critical architectural rationale, rejected alternatives, system constraints, performance invariants, and operational lessons across all future development iterations.

---

## 1. Architectural Decisions (ADR Log)

### ADR-001: Zero-to-One Clean Slate Rebuild
- **Date:** 2026-10-06
- **Context:** Project-X / X-29 was previously subject to legacy structural baggage, brittle styling, and non-modular components.
- **Decision:** Mandate a full zero-from-scratch architectural rebuild. Do not inherit legacy classes, structures, or assumptions.
- **Consequence:** Clean domain contracts, unified modern design tokens, modern React 19+ strict conventions, and zero technical debt carryover.

### ADR-002: Documentation-First Governance System
- **Date:** 2026-10-06
- **Context:** Large-scale ambitious spatial platforms degrade quickly if features are built ad-hoc without formal design systems or performance budgets.
- **Decision:** Enforce an immutable governance system (`TECHNOLOGY.md`, `PRD.md`, `ARCHITECTURE.md`, `RULES.md`, `DESIGN.md`, `TASKS.md`, `MEMORY.md`, and `PALETTE.md`) created in Execution Phase 0 prior to writing application code.
- **Consequence:** Every future prompt follows a standardized 7-step engineering intake process.

### ADR-003: Multi-Tier Hybrid Rendering (Spatial DOM + WebGL Canvas)
- **Date:** 2026-10-06
- **Context:** Full 3D interfaces often fail basic web accessibility (screen readers cannot inspect WebGL meshes), have sluggish text rendering, and consume excessive mobile battery. Pure 2D flat interfaces fail the cinematic spatial depth requirement.
- **Decision:** Split the platform into an underlying WebGL spatial coordinate viewport (infinite grid, orbital meshes) and a floating DOM presentation layer with CSS 3D transforms, translucent obsidian slabs, and full semantic HTML markup.
- **Rejected Alternative:** Building the entire interface inside Three.js / Canvas via `@react-three/drei` HTML overlays. (Reason rejected: severe input lag, broken IME text input, inability to use native browser text selection and screen reader accessibility).

### ADR-004: Token-Based Dark Spatial Aesthetic Over Generic SaaS
- **Date:** 2026-10-06
- **Context:** Enterprise applications default to flat white panels, generic high-radius cards, and pastel gradients that look like generic templates.
- **Decision:** Ground the visual language in deep obsidian tones (`#030508` to `#0c1018`), hairline edge highlights, subtle elevation parallax, and luminescent telemetry signals (Cyan, Indigo, Emerald, Amber).

### ADR-005: Ratified Background Grid (#0B0D13) and Fixed Semantic Color Matrix
- **Date:** 2026-10-06
- **Context:** User instruction explicitly ratified the exact foundational colors and grid specifications for the zero-to-one rebuild: Base Canvas `#0B0D13`, Card Surface `#131722`, Card Border `#1F2637`, Primary Accent `#6366F1`, Focus/Timer `#F59E0B`, Success/Pace `#10B981`, Warning/Critical `#F43F5E`, Text Primary `#F8FAFC`, Text Muted `#94A3B8`.
- **Decision:** Implemented `SpatialBackground` as an inherited environment layer (dual mesh at 32px `rgba(255,255,255,0.035)` and 128px `rgba(255,255,255,0.060)`) sitting behind all content. Created `FloatingCard` with physical elevation lift (`#131722` surface, `#1F2637` border, `1px solid rgba(255,255,255,0.06)` specular hairline) ensuring cards float above the grid rather than blending into it.
- **Consequence:** Guaranteed consistency across all current and future views; desktop subtle cursor parallax with mobile performance fallbacks; zero unauthorized accent colors allowed.

### ADR-006: Clean Slate Canvas State (Preserving Environment & Tokens)
- **Date:** 2026-10-06
- **Context:** User requested removal of all demo blocks and UI components, leaving only the pure spatial background active on screen, while strictly retaining the color palette tokens, CSS variables, and spatial background architecture for subsequent custom element construction.
- **Decision:** Cleared `App.tsx` down to `<SpatialBackground />`, purged temporary feature components, and maintained all color tokens and primitives (`FloatingCard`, `PALETTE.md`, `index.css`).
- **Consequence:** Pure spatial background canvas is ready for the operator to introduce new items and components.

### ADR-007: High-Density Animated Grid & Full-Monitor Viewport Fit
- **Date:** 2026-10-06
- **Context:** User requested decreasing the grid cell area and increasing grid line count (higher cell density), adding continuous auto-animation to the grid, and configuring the site to fit full monitor width edge-to-edge.
- **Decision:** Decreased grid spacing to 16px (minor) and 64px (major), delivering a 4x increase in cell count. Implemented continuous hardware-accelerated auto-animations: dual-layer coordinate drift (`animate-grid-drift-minor` / `major`), periodic sweeping radar scan beam (`animate-radar-sweep`), and atmospheric glow pulse (`animate-ambient-pulse`). Expanded canvas to 100vw x 100vh full monitor fit without width constraints.
- **Consequence:** Immersive edge-to-edge cinematic command environment operating smoothly at 60 FPS with reduced-motion support.

### ADR-008: Single Unified Base Grid with Continuous Animation
- **Date:** 2026-10-06
- **Context:** User instructed to retain the auto-animations while consolidating the background to strictly one single grid layer with the same base grid area (16px).
- **Decision:** Removed the secondary overlapping 64px major grid layer, consolidating the background into a single high-density base grid mesh (`spatial-grid-base` at 16px) with perpetual continuous coordinate drift (`animate-grid-drift`), subtle sweeping radar beam (`animate-radar-sweep`), and ambient atmospheric breathing.
- **Consequence:** Eliminates visual interference from competing overlapping grids; delivers a clean, uniform, and animated technical coordinate plane.

### ADR-009: Application Shell, History Routing & Blank Page Architecture
- **Date:** 2026-10-06
- **Context:** User requested implementing the complete X-29 application shell based on uploaded wireframe `a.png`: X-29 logo (navigates to `/dashboard/`), global header, left sidebar with 10 menu items + Account at the bottom, exact 11 clean routes with URL changes, pushState/popstate browser history synchronization, and smooth 200ms page transitions while keeping all pages intentionally blank.
- **Decision:** Implemented lightweight client-side HTML5 History routing in `src/lib/router.ts` (without bulky external routing dependencies), created responsive `Sidebar.tsx` matching wireframe `a.png`, `Header.tsx`, and `PageContainer.tsx` with floating elevation. Preserved the animated spatial background and exact color tokens.
- **Consequence:** Every route has an independent URL (`/dashboard/`, `/analytics/`, `/focus/`, `/daily-actions/`, `/daily-schedule/`, `/subjects/`, `/pace-management/`, `/master-config/`, `/outcome/`, `/exam-routine/`, `/account/`), browser Back/Forward/Refresh functions deterministically, and the UI floats over the animated grid.

### ADR-010: Transparent Floating Rounded Shell Architecture
- **Date:** 2026-10-06
- **Context:** User provided updated wireframe `a (1).png` demanding that the grid background remain prominently visible behind and through all UI surfaces. Specifically required: transparent floating rounded capsule buttons for navigation, transparent header with floating capsules (`Exam countdown`, status telemetry, account control), and a large rounded-3xl floating semi-transparent page container with an intentionally blank body.
- **Decision:** Updated `Sidebar.tsx`, `Header.tsx`, and `PageContainer.tsx` with transparent glass styling (`bg-[#131722]/35-50`, `backdrop-blur-md`, `border-white/[0.08]`, `rounded-full` capsules and `rounded-3xl` panels). Grid animations and lines show through clearly without opaque occlusions.
- **Consequence:** Delivers the exact "Dark grid space + transparent floating rounded panels + futuristic minimal UI" visual model depicted in `a (1).png`.

### ADR-011: Dual-Block Floating Header & Strict Column Icon Alignment
- **Date:** 2026-10-06
- **Context:** User requested removing Operator and Page Title from the Header, replacing it with only two larger floating glass blocks (Block 1: Exam Countdown, Block 2: Progress / Score), making the page body completely transparent so the Grid BG is clearly visible throughout, and enforcing strict identical horizontal alignment for navigation button icons and text across all menu items.
- **Decision:** Refactored `Header.tsx` to render strictly the two floating blocks with comfortable padding and larger dimensions; updated `PageContainer.tsx` with `bg-transparent` so no opaque fills cover the grid; updated `Sidebar.tsx` with fixed-width icon wrappers (`w-5 shrink-0`) and unified text offset (`ml-3`) so all items align in a razor-straight column.
- **Consequence:** Delivers the pristine, transparent floating command deck aesthetic with consistent optical alignment.

### ADR-012: Background Mode Setting & Header Telemetry Blocks
- **Date:** 2026-10-06
- **Context:** User instructed to add an Appearance / Background Mode setting inside the Account page (`Grid Mode` vs `Transparent Mode`) persisted in localStorage across page navigation and refresh. Also required expanding the Header to feature: 1) Upcoming Exam countdown block (`Upcoming Exam / [Subject Name] — [Timer]`) and 2) Four separate floating telemetry blocks (`Clock`, `Success Score`, `Time Elapsed`, `Final Deadline`) with generous width and height padding, without Operator or Page Title.
- **Decision:** Implemented `AccountView.tsx` with an interactive selector (`○ Grid / ● Transparent`) backed by localStorage; updated `Header.tsx` with the requested 5 distinct floating blocks; maintained 100% transparent body so the Grid BG remains prominent throughout.
- **Consequence:** Full user control over background presentation while providing instant visibility into live countdown, 24h clock, success score, elapsed time, and deadline.

### ADR-013: Reactive Background Mode Toggle & Surface State Binding
- **Date:** 2026-10-06
- **Context:** Audit revealed that while the background component supported mode flags, the main `PageContainer` and `Sidebar` did not bind dynamic classes to `backgroundMode`, causing surface styles to remain static. Furthermore, with `DISABLE_HMR=true`, dev server bundle cache required a restart.
- **Decision:** Connected `backgroundMode` dynamically across `PageContainer` (switching between structured floating card surface in `grid` mode vs 100% transparent body in `transparent` mode) and `Sidebar`. Provided standard accessible radio inputs with immediate reactive callbacks and localStorage persistence. Restarted Vite dev server to guarantee fresh build serving.
- **Consequence:** Toggling between Grid and Transparent mode updates all application surfaces instantly without reload, persists across page navigation and browser refresh, with zero console errors.

### ADR-014: Bulletproof Mobile Responsive Design with 3-Dot Navigation Modal
- **Date:** 2026-10-06
- **Context:** Mobile viewports (< 1024px, and down to 320px) required replacing the desktop navigation layout with a compact mobile header featuring: 1) Upcoming Exam countdown, 2) compact 3-dot menu button, and 3) responsive 3-column row displaying `Success Score | Day Elapsed | Final Deadline` (with Final Deadline explicitly guaranteed visible and never pushed off-screen). Desktop design was preserved.
- **Decision:** Implemented dual-mode responsive header in `Header.tsx` (`hidden lg:flex` for desktop, `flex lg:hidden` for mobile). Added a mobile 3-dot floating modal containing all 11 navigation items with outside-click and escape dismissal, active route highlight, and viewport overflow protection. Tested and optimized padding across 320px–430px viewports with zero horizontal scrolling.
- **Consequence:** 100% mobile usability across narrow screens while retaining desktop presentation, grid animations, and background mode persistence.

### ADR-015: Smooth Hardware-Accelerated Mobile 3-Dot Menu Animation
- **Date:** 2026-10-06
- **Context:** User requested that clicking the 3-dot menu button on mobile opens the menu with smooth, high-fidelity animations.
- **Decision:** Added bespoke GPU-accelerated keyframe animations in `src/index.css`: `menuBackdropFadeIn` (220ms ease-out backdrop blur and opacity transition), `menuModalSmoothIn` (280ms cubic-bezier spring scale, translation and blur filter fade), and `menuItemSlideFade` with staggered 18ms cascading delays across all 11 navigation items.
- **Consequence:** Silky smooth mobile menu entrance and tactile interactive response.

### ADR-016: Modern Dark-Themed Responsive Dashboard Layout & Detached 3-Part Header
- **Date:** 2026-10-07
- **Context:** User requested a modern, dark-themed responsive dashboard layout in React (Tailwind CSS) based on strict layout and alignment rules: 100vh fullscreen height, 2-column layout (260px fixed width left sidebar column and 1fr flex-1 right main area) evenly padded with consistent gaps; Top-left "App Name / Logo" block with transparent background matching 260px width and sharing exact height (h-14) and baseline with the 3-part detached header; Detached 3-Part Header with "Exam countdown" pill on left, transparent center section ("Header transparent"), and metrics pill on right ("Clock | Success score | Time Elapsed | Final Deadline"); Sidebar Navigation with 10 pill-shaped outlined buttons and pinned Account button strictly at bottom; and large rounded dark card Main Body container directly underneath header with distinct gap (not visually connected, exact same width and boundaries as header, centered placeholder text "blank Body").
- **Decision:** Restructured the application shell into an edge-to-edge 2-column flex grid (`h-screen overflow-hidden p-3 sm:p-4 lg:p-5 gap-3 sm:gap-4 lg:gap-5 bg-slate-950`). Aligned `Sidebar` (260px) and `Header` (`h-14`) to share the horizontal baseline. Implemented the 3-part detached header with `flex justify-between items-center`, transparent middle section, live countdown timer, and live clock metrics. Pinned Account pill button strictly to the bottom of the sidebar with `mt-auto`. Styled Main Body as a detached rounded card (`rounded-2xl sm:rounded-3xl border border-zinc-800/80 bg-zinc-900/30`) with distinct vertical gap and prominent centered placeholder text "blank Body".
- **Consequence:** 100% adherence to all 6 layout, alignment, and aesthetic rules.

### ADR-017: Month Switcher Button Active Glow State & Feedback
- **Date:** 2026-10-09
- **Context:** In `MonthlyTargetsSetupCard`, user targeted all three month switcher buttons (`<- Past Month`, `Present Month`, `Future Month ->`) with visual reference `image.png`, specifying that whichever month is selected will always exhibit the glowing neon indigo state.
- **Decision:** Bound `isPastMonth`, `isCurrentMonth`, and `isFutureMonth` to each button, delivering the exact atmospheric neon indigo glow from the screenshot (`bg-[#4F46E5]`, `shadow-[0_0_20px_rgba(99,102,241,0.7),0_0_36px_rgba(99,102,241,0.4)]`, crisp border `border-[#818CF8]/70`, `ring-1 ring-[#818CF8]/40`, `relative z-10`), with smooth 200ms transitions.
- **Consequence:** 100% visual fidelity matching `image.png`, ensuring Past Month, Present Month, and Future Month always glow whenever selected.

### ADR-018: Weekly Targets Section Architecture & Monthly Target Set Up Page Routing
- **Date:** 2026-10-10
- **Context:** User requested:
  1. Add a dedicated `Weekly Targets` section below `Monthly Targets`, sharing the structural design (week switcher, telemetry pace badges, targets database, checklist) but omitting the Add button.
  2. The Add button on the Monthly Targets section navigates to the dedicated workspace page titled `Monthly Target Set Up`.
  3. Rename "Monthly Targets Setup" section to "Monthly Targets".
  4. Follow the spatial transparent theme & color palette, implement animations exclusively on PC (`md:` breakpoint) while maintaining instant touch response on mobile (`< md`), and maintain automated cross-device sync.
- **Decision:**
  - Implemented `WeeklyTargetsCard.tsx` positioned below `MonthlyTargetsSetupCard` in `DailyActionsView.tsx`.
  - Added Week Switcher (`<- Past Week`, `Present Week`, `Future Week ->`) with the active neon glow state (`shadow-[0_0_20px_rgba(99,102,241,0.7),0_0_36px_rgba(99,102,241,0.4)]`).
  - Added `TargetsDatabaseModal` support for both Monthly and Weekly targets with tabs.
  - Linked the Monthly Targets `ADD` button to navigate directly to `/monthly-target-setup/` titled `Monthly Target Set Up`.
  - Applied desktop-only animations (`md:transition-all md:hover:-translate-y-0.5 md:animate-pulse`) while preserving mobile zero-lag touch performance (`transition-none`).
  - Powered real-time cross-device sync via `DailyActionsContext` and Firestore (`customData.dailyActionsData.weeklyTargets`).
- **Consequence:** Fully satisfies all 4 core requirements with high visual polish, rock-solid routing, and resilient state synchronization.

### ADR-019: Monthly Target Chapters Program & Subject Tree Hierarchy and Right Chapter List Container
- **Date:** 2026-10-10
- **Context:** User requested:
  - In Monthly Target Chapter, implement a 2-box split container layout:
    1. Left container: Program and Subject tree hierarchy, where each Subject features an interactive checkbox.
    2. Right container: When subject(s) are selected via checkboxes, the right box container dynamically displays the full chapter list of those selected subjects.
  - Comply with design rules: do not duplicate exact copy, follow site template transparent theme and color palette tokens, enable animations exclusively on PC view (`md:` breakpoint) and keep phone view snappy without delay, ensure high performance and responsiveness, and support automatic cross-device sync.
- **Decision:**
  - Implemented `MonthlyTargetChaptersSection.tsx` embedded as the primary view in `MonthlyTargetSetupView.tsx`.
  - Left Container: Collapsible Program nodes with subject count badges, search filtering, Select All/Clear controls, and interactive checkboxes on each Subject item with glowing active state (`bg-[#6366F1]/15 border-[#6366F1]/50`).
  - Right Container: Dynamic chapter list of checked subjects with empty state guidance, chapter search filtering, per-subject groupings, chapter status badges, target checkboxes, and batch allocation actions (`Confirm & Allocate [N] Chapters to [MonthKey]`).
  - Starter curriculum in `AcademicHierarchyContext.tsx` starts empty by default without hardcoded predefined programs or subjects.
  - Desktop PC animations (`md:transition-all md:hover:-translate-y-0.5 md:animate-pulse`) paired with instantaneous mobile touch behavior (`transition-none`).
  - Automatic cross-device synchronization with Firestore and localStorage through `DailyActionsContext` and `AcademicHierarchyContext`.
- **Consequence:** 100% adherence to all user requirements and design constraints.

### ADR-020: Chapter List Weekly Dropdown of the Month, Size Selector, and 2-Bar Grid Layout
- **Date:** 2026-10-10
- **Context:** User requested:
  1. In Chapter curriculum list, configure each chapter bar with a Size dropdown (`S`, `M`, `L`, `XL`) and a Weekly dropdown for the selected month.
  2. Weekly dropdown is strictly Saturday to Friday (7-day cycles) clipped only to that month's boundaries.
  3. When a week spans a month boundary, the days are divided cleanly: e.g., if the last week of a month has 4 days in this month and 3 days in the next month, in this month's dropdown it shows the 4 days (`Week 5: [Dates · 4 days]`), and in the next month's 1st week it shows the 3 days (`Week 1: [Dates · 3 days]`).
  4. When a chapter is bound to a week, it immediately links and transfers to the Weekly Targets section.
  5. Both Monthly Targets and Weekly Targets sections, as well as the Chapter curriculum list, are designed with a 1-chapter-1-bar format where 2 bars are placed in one row (`grid grid-cols-1 md:grid-cols-2 gap-3`).
- **Decision:**
  - Enhanced `src/features/daily-actions/utils/weekUtils.ts` with `getMonthWeeks` and `getMonthWeeksByMonthKey` implementing precise Saturday-to-Friday month boundary clipping and partial week computation.
  - Updated `DailyActionsContext.tsx` with `monthWeeks`, `activeMonthWeek`, `selectedMonthWeekId`, `selectMonthWeekById`, `bindChapterToWeek`, and `unbindChapterFromWeek`.
  - Refactored `MonthlyTargetChaptersSection.tsx` chapter list to `grid grid-cols-1 md:grid-cols-2 gap-2.5` (1 chapter 1 bar, 2 bars per row), featuring chapter checkbox, chapter number badge, star/priority indicator, Size dropdown (`S`, `M`, `L`, `XL`), and the month-clipped Saturday-to-Friday weekly dropdown.
  - Bound chapters display real-time feedback badges (`✓ Week 2`) with quick unbind options and direct integration into `weeklyTargets`.
  - Updated `WeeklyTargetsCard.tsx` with a Saturday-to-Friday monthly week dropdown selector and quick week pill tabs (`Week 1`, `Week 2`, etc.), displaying active targets in a 2-bar row layout (`grid grid-cols-1 md:grid-cols-2 gap-3`).
  - Confirmed `MonthlyTargetsSetupCard.tsx` also follows the 1-chapter-1-bar format with 2 bars per row.
- **Consequence:** Seamless end-to-end curriculum chapter binding into weekly targets, fully verified with clean compilation and lint passes.

### ADR-021: Outcome System Implementation (Program CGPA, Achievement, Target Resolution & Auto Pass/Freeze Sync)
- **Date:** 2026-10-12
- **Context:** The Outcome module required complete implementation of: 1) Dual result types: Program CGPA and Achievement milestones, 2) Dual evaluation modes: CGPA-based (0.00-4.00 numeric scale) and Grade-based (letter grades with conversion maps), 3) Pure math conversion utilities (`mapGradeToNumeric`, `mapCgpaToGrade`, and denominator-calibrated estimates), 4) Manual vs Estimated overall results with verification indicators (green checkmark for matches within tolerance, red cross for mismatches), 5) 3-tier program target resolution with explicit cleared-target handling (`Target: None`), 6) Target propagation to subject rows in specified formats, 7) Distinct Pass/Fail evaluation rules separate from Goal Met criteria, 8) Curriculum completeness check for Goal Met status, and 9) Automatic Pass/Freeze synchronization with the task system and manual toggle retention.
- **Decision:** Implemented `src/features/outcome/utils/outcomeEvaluation.ts` as a pure, type-safe calculation engine; integrated target configuration and automatic freeze synchronization into `OutcomeContext.tsx`; updated `AddResultModal.tsx` matching the canonical modal layout and controls; enhanced `LoggedResultsSection.tsx` with dedicated Achievement and Program CGPA card presentations; verified the entire system with an automated 8-suite test suite in `outcomeWorkflow.test.ts`.
- **Consequence:** 100% specification adherence, zero TypeScript errors, clean production build, and resilient cross-device state persistence without duplicate records or cyclic loops.

---

## 2. Rejected Alternatives & Architectural Guardrails

| Proposal / Pattern | Status | Reason Rejected | Approved Standard |
| :--- | :--- | :--- | :--- |
| **All-in-One Global Context** | Rejected | Causes widespread re-renders of unrelated widgets when a single metric updates. | Granular Zustand store slices with selective equality functions. |
| **Unrestricted 60fps RAF in Three.js** | Rejected | Causes thermal throttling and battery drain when users leave the dashboard open in a background tab. | On-demand rendering (`frameloop="demand"`), pausing when scenes are static or tab is hidden. |
| **CSS-in-JS (Emotion / Styled Components)** | Rejected | Substantial runtime overhead, CSS injection latency, and incompatibility with modern React server rendering and Tailwind v4 engine. | Tailwind CSS v4 utility classes + CSS Custom Variables for dynamic token access. |
| **Monolithic Dashboard File** | Rejected | Becomes unmaintainable after 2 feature iterations. | Modular feature-slice folders with strict import boundaries. |

---

## 3. Known System Constraints & Invariants

1. **AI Studio Runtime Environment:**
   - Development server operates on port 3000.
   - HMR is disabled in this environment to prevent editor flickering; full-page rebuilds must compile deterministically.
   - Browser popups (`window.open`) and modal alerts (`window.alert`) are blocked within iframe sandboxes. All modals must be internal floating dialogs.
2. **WebGL Device Diversity:**
   - A measurable percentage of user devices lack dedicated GPU acceleration or have hardware WebGL disabled.
   - The application must always feature a hardware capability detection hook that gracefully switches to a high-contrast CSS vector grid and SVG charts if WebGL context creation fails.
3. **Data Boundary Invariant:**
   - Raw external JSON must never be cast with `as Type`. It must parse through a Zod schema so corrupted state fails early with informative recovery paths.

---

## 4. Future Considerations & Roadmap Horizons

- **Cross-Device Telemetry Synchronization:** When cloud persistence is enabled, use WebSocket/WebRTC channels with CRDT (Conflict-Free Replicated Data Types) for instantaneous multi-device state syncing.
- **Native Spatial Audio Feedback:** Subtle, low-frequency soundscapes for command palette triggers, workspace transitions, and orbital selections (with universal mute toggle and zero-audio default).
- **Extensible Widget Plugin Architecture:** Allow operators to register custom dynamic micro-widgets with defined telemetry schemas into the modular dashboard dock.
