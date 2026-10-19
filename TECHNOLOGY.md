# Project-X / X-29 — Technology Constitution

> **Status:** Ratified & Permanent  
> **Document Role:** Authoritative engineering standard, stack definition, and architectural decision framework for Project-X / X-29.

---

## 1. Core Stack Direction

Project-X / X-29 is engineered as an enterprise-grade, high-performance, spatial personal operating system and command deck. The technology stack balances bleeding-edge visual and spatial capabilities with ironclad type safety, accessibility, and runtime predictability.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION & SPATIAL LAYER                    │
│   React 19+ (TypeScript)  │  Tailwind CSS v4  │  Radix / Accessible Prims│
│   Three.js / React Three Fiber (Spatial/3D)   │  GSAP & Native CSS Keyframes│
├────────────────────────────────────────────────────────────────────────┤
│                     DATA VISUALIZATION & INTERACTIVITY                 │
│   Apache ECharts / Canvas / SVG Micro-Charts  │  Motion Engine          │
├────────────────────────────────────────────────────────────────────────┤
│                        STATE & APPLICATION LOGIC                       │
│   Zustand (Global Client State)  │  TanStack Query (Async / Server State)│
│   Zod (Schema Validation & Parse Boundaries)                           │
├────────────────────────────────────────────────────────────────────────┤
│                       DATA ACCESS & PERSISTENCE                        │
│   PostgreSQL / SQLite Compatible DAL  │  Drizzle ORM                   │
│   PWA Service Workers (Offline & Cache Strategy)                       │
└────────────────────────────────────────────────────────────────────────┘
```

### Preferred Technology Matrix

| Layer | Primary Selection | Rationale & Trade-offs | Fallback / Condition |
| :--- | :--- | :--- | :--- |
| **Framework** | Next.js / React SPA (TypeScript Strict) | Industry benchmark for rendering performance, routing, server component boundaries, and asset optimization. | Modern Vite + React SPA when pure client runtime is required. |
| **Styling** | Tailwind CSS (v4 engine) | Zero-runtime CSS extraction, deterministic utility compilation, design token integration via CSS variables. | Pure CSS Modules for isolated GPU animation sequences. |
| **Component Primitives** | Radix UI / Headless UI patterns | Unstyled, fully accessible (WAI-ARIA compliance), keyboard-navigable foundation. | Custom SVG / Canvas for bespoke spatial controls. |
| **Animation & Choreography** | GSAP (GreenSock) + Native CSS Keyframes | Timeline sequencing, SVG morphing, scrubbed timelines, sub-pixel rendering accuracy without jank. | CSS Transitions and View Transitions API for basic state changes. |
| **Spatial / 3D Engine** | Three.js + React Three Fiber (R3F) | Declarative WebGL/WebGPU rendering, spatial scene graph, instanced meshes, depth buffers for the infinite grid and orbital nodes. | CSS 3D transforms & 2D Canvas fallbacks for low-power or mobile environments. |
| **Data Visualization** | Apache ECharts | High-volume canvas/SVG rendering, rich interaction models (crosshairs, brush, zoom, data zoom, multi-axis). | Lucide/custom SVG sparklines for lightweight micro-metrics. |
| **Validation** | Zod (v3+) | Compile-time and runtime schema synchronization. Guarantees zero untyped data enters domain logic. | TypeScript compiler assertions for internal invariants. |
| **Client State** | Zustand | Zero-boilerplate, selector-based subscriptions, outside-React imperative access, zero re-render waste. | React Context strictly for subtree theme/scope providers. |
| **Async / Cache State** | TanStack Query | Automatic deduplication, background revalidation, stale-while-revalidate, optimistic mutations. | In-memory synchronous stores for local session mocks. |
| **Persistence / ORM** | Drizzle ORM | Edge-ready, zero-overhead SQL-like type safety, predictable query generation, clean migrations. | Clean Repository / DAL abstraction interface. |
| **Offline / PWA** | Web App Manifest + Service Worker | Native app feel, cache-first static shell, offline telemetry buffering. | Standard responsive web mode when PWA criteria are unneeded. |

---

## 2. Technology Selection Rule

> **"Advanced" does NOT mean "use every library."**

Dependencies are accepted into the project **only** if they satisfy the evaluation equation:

$$\text{Decision Score} = \frac{\text{Capability} \times \text{Maintainability} \times \text{Ecosystem Maturity}}{\text{Bundle Weight} \times \text{Runtime Overhead} \times \text{Cognitive Friction}}$$

### Non-Negotiable Acceptance Criteria

1. **Zero Redundancy:** Never install two packages that solve the same functional problem (e.g., Lucide and FontAwesome, or Lodash and Ramda).
2. **Bundle Discipline:** Every dependency must support ES module tree-shaking. No monolithic legacy CommonJS blobs.
3. **Replaceability:** Core domain logic must never import vendor-specific APIs directly. Wrap third-party tools behind application service boundaries and adapters.
4. **Accessibility Barrier:** A library that breaks keyboard navigation or screen reader accessibility is disqualified, regardless of aesthetic appeal.
5. **No "Showcase" Dependencies:** Never introduce a library merely to look technologically complex. Every byte must serve product utility and user experience.

---

## 3. Versioning & Dependency Policy

1. **Current Stable Standard:** Always pin dependencies to verified stable releases. Do not use experimental releases unless a mandatory feature has no production alternative.
2. **Zero Antiquated Paradigms:** Obsolete patterns (e.g., React Class components, Redux boilerplate without slices, jQuery, legacy Webpack configs) are strictly forbidden.
3. **Audit & Deprecation:** Regularly audit installed packages for security advisories and deprecation warnings. Deprecated packages must be excised or migrated immediately.
4. **Decoupled Architecture:** Keep third-party interfaces isolated inside `/lib` or `/services` adapters so swapping an underlying library requires modifying only one file.

---

## 4. Fundamental Architectural Principles

### 4.1 Type Safety (Strict Mode)
- `tsconfig.json` must enforce `strict: true`, `noImplicitAny: true`, and `strictNullChecks: true`.
- Zero `any` types permitted. Use `unknown` with Zod validation guards or discriminated union types.

### 4.2 Modular Ownership Boundaries
- Features are encapsulated in `/features/<feature-name>` containing their own UI, store, hooks, types, and services.
- Cross-feature dependencies must flow through explicit domain contracts in `/lib` or shared stores, never through internal private feature paths.

### 4.3 Observable & Testable Design
- Every domain calculation, formatting helper, and state reducer must be deterministic and pure.
- UI components must decouple visual presentation from data acquisition.

### 4.4 Defensive Error Isolation
- React Error Boundaries wrap spatial 3D viewports, chart components, and dynamic widgets to prevent entire page crashes.
- Graceful degradation: If WebGL fails, the application automatically transitions to a 2D high-contrast CSS grid.

### 4.5 Security By Default
- Client environment variables are strictly limited to public configuration (`VITE_*` or `NEXT_PUBLIC_*`).
- User inputs undergo sanitization and Zod parsing before dispatch or state persistence.
- Zero `eval()`, zero `dangerouslySetInnerHTML` without rigorous DOMPurify sanitization.
