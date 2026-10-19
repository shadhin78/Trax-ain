# Project-X / X-29 — Engineering Constitution & Non-Negotiable Rules

> **Status:** Mandatory & Active  
> **Scope:** All current and future code additions, architectural decisions, refactors, and UI generation for Project-X / X-29.

---

## 1. The Core Implementation Rule

Every future user prompt is an **actionable implementation request**. The engineering workflow must follow an invariant 7-step sequence:

```text
1. INTERPRET  ──► Understand the true operational outcome, not merely literal syntax.
2. INSPECT    ──► Read PRD, ARCHITECTURE, RULES, DESIGN, TASKS, and MEMORY.
3. PLAN       ──► Scope modules, state contracts, a11y, performance, and responsive impact.
4. IMPLEMENT  ──► Write production-grade, type-safe, modular code following design tokens.
5. VERIFY     ──► Test functionality, 60fps performance, keyboard accessibility, mobile behavior.
6. SYNCHRONIZE──► Update TASKS.md, PRD.md, and MEMORY.md immediately.
7. REPORT     ──► Present a concise, structured engineering summary.
```

---

## 2. The Defensive Engineering Rule (Guardrails Over Blind Execution)

**Never blindly follow a prompt if doing so would degrade system integrity.**

If a requested implementation would:
- Create a security vulnerability or expose secrets;
- Introduce redundant libraries or bloat the bundle size;
- Degrade runtime framerate below 55 FPS or trigger memory leaks;
- Break responsive behavior or render mobile devices unusable;
- Violate WCAG accessibility or lock out keyboard users;
- Corrupt local data schemas or create brittle monolithic files;

**Action Required:**
1. Formulate a safer, production-grade architectural path that achieves the user's objective without the negative consequence.
2. Implement that superior pattern.
3. Explicitly log the architectural deviation and reasoning in `docs/MEMORY.md`.

---

## 3. Visual & Aesthetic Rules (Anti-Generic SaaS Mandate)

1. **No Generic White Dashboards:** Never default to flat white cards, sterile enterprise gray tables, or generic Bootstrap/Tailwind templates.
2. **Spatial Command Center Presence:** Every view must feel like a high-precision digital cockpit or spatial OS. Surfaces float on calibrated depth planes over an infinite dark grid.
3. **Calibrated Restraint:** Futuristic does **not** mean cartoonish sci-fi, chaotic neon glows, or blinding laser borders. Emphasize obsidian surfaces, hairline borders, atmospheric lighting, and high-readability typography.
4. **Token Enforcement:** Hard-coded color hex values inside component classes are strictly prohibited. Every color, shadow, glow, and border must resolve from `/color-palette/PALETTE.md` and CSS variables.

---

## 4. Interaction & Motion Rules

1. **Intentional Feedback for Every Interaction:**
   - **Hover:** Subtle elevation lift, hairline highlight illumination, micro-scale change (1.00 -> 1.01), or ambient glow flare.
   - **Press / Active:** Mechanical tactile compression (0.98 scale or translation change), depth sink.
   - **Focus:** High-visibility, crisp offset outline for keyboard navigation.
   - **Loading:** Pulsing telemetry skeletons or progressive laser indicators, never generic spinning GIFs.
   - **Error / Warning:** Crisp amber/crimson edge wash, non-blocking telemetry alert banner.
2. **Causality Over Decoration:** Motion must communicate where an element came from, what it is doing, and where it goes. Never animate elements randomly or introduce sluggish 800ms delays that slow user productivity.
3. **Reduced Motion Support:** Always wrap non-essential spatial loops and continuous animations in `@media (prefers-reduced-motion: reduce)` queries.

---

## 5. Accessibility (A11y) Standards

1. **Full Keyboard Navigation:** Every button, tab, drawer, command trigger, and modal must be operable via `Tab`, `Enter`, `Space`, and `Escape`.
2. **Visible Focus Rings:** Never write `outline: none` without providing an enhanced, accessible `focus-visible` ring.
3. **Semantic HTML First:** Use `<button>`, `<nav>`, `<aside>`, `<main>`, `<section>`, and `<dialog>` elements rather than clickable `<div>` soup.
4. **Contrast Compliance:** All text tokens against dark surface layers must satisfy WCAG AA contrast (minimum 4.5:1 for body copy, 3:1 for large display headers).

---

## 6. Responsive & Multi-Device Standards

1. **Desktop (> 1200px):** Full spatial experience with interactive 3D grid, floating side HUD docks, and dense multi-column telemetry.
2. **Laptop / Tablet (768px – 1199px):** Adaptive 2-column or collapsable dock layout; dynamic throttling of particle counts.
3. **Mobile (< 768px):** Purpose-built ergonomic viewports. Convert 3D orbital graphs into interactive 2D node trees or radial accordions. Side docks become bottom sheets with swipe gestures.
4. **No Overflow Horizontals:** The viewport root must never produce unintentional horizontal scrollbars.

---

## 7. Code Quality & Clean Code Standards

1. **Zero Monoliths:** No single component file may exceed 300 lines of code. Split into sub-components, custom hooks, and utility helpers.
2. **Zero `any`:** Strict TypeScript typing. Use Zod schemas for runtime boundary parsing.
3. **Zero Dead Code:** Remove commented-out code blocks, unused imports, and unreferenced variables before completing any task.
4. **Zero Console Noise:** No leftover `console.log` statements in production code. Use an isolated telemetry logger if diagnostics are required.
5. **Pure Functions:** Business calculations, coordinate transformations, and data formatters must be pure functions isolated in `/lib`.
