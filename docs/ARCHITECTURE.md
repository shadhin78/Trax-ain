# Project-X / X-29 — System Architecture Specification

> **Status:** Ratified  
> **Document Role:** Architectural blueprint, module boundaries, data pipelines, rendering strategies, and performance contracts.

---

## 1. High-Level Architectural Model

The X-29 architecture adheres to a strict unidirectional data flow and layered separation of concerns. No presentation component executes raw queries or mutates persistence directly.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                          PRESENTATION LAYER                            │
│  [Spatial Viewport (Three.js/Canvas)]     [HUD & Floating Panels (DOM)]│
│  [Micro-Interactions & GSAP Timelines]    [Context Drawers & Modals]   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ UI Events / Actions
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       STATE & COORDINATION LAYER                       │
│  [Zustand Stores (UI, Viewport, Mode)]    [TanStack Query (Async Sync)]│
│  [Spatial Math & Coordinate Transforms]   [Event Bus / Command Center] │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Domain Queries / Mutations
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        DOMAIN & VALIDATION LAYER                       │
│  [Zod Schemas & Parse Boundaries]         [Goal & Telemetry Engine]    │
│  [Data Transformation Pipelines]          [Error Isolation Boundaries] │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Normalized I/O
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     DATA ACCESS LAYER (DAL) & ADAPTERS                 │
│  [Storage Repository (IndexedDB/Local)]   [REST/RPC Service Connectors]│
│  [Drizzle ORM / SQL Schema Bridge]        [Offline Event Queue]        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Directory & Component Organization

The repository follows a domain-driven, feature-sliced architecture:

```text
src/
├── app/                       # Top-level application shell, layout providers, root canvas
├── components/                # Universal, domain-agnostic UI primitives
│   ├── ui/                    # Buttons, modals, inputs, sliders, tooltips, tags
│   ├── layout/                # Shell, HUD bars, side docks, splitters
│   ├── spatial/               # Infinite grid, canvas wrapper, camera rigs, light rigs
│   └── feedback/              # Skeleton loaders, empty states, error fallbacks
├── features/                  # Domain-encapsulated feature modules
│   ├── command-palette/       # Omni-bar, fuzzy search actions, hotkey listener
│   ├── orbital-goals/         # 3D goal nodes, milestone graph, orbit math
│   ├── telemetry/             # System health, memory/FPS monitors, status badge
│   ├── analytics-deck/        # ECharts time-series, metric cards, sparklines
│   └── workflow-canvas/       # Task boards, priority queues, status transitions
├── hooks/                     # Reusable hooks (useMediaQuery, useHotkey, useViewportSize)
├── lib/                       # Utility libraries, coordinate math, GSAP ticker helpers
├── services/                  # External service adapters, persistence repositories
├── store/                     # Global Zustand slices (viewport, activeWorkspace, settings)
├── types/                     # Shared TypeScript interfaces, enums, Zod schemas
├── config/                    # System defaults, theme constants, telemetry limits
└── styles/                    # Global Tailwind rules, font declarations, CSS variables
```

---

## 3. Data Architecture & Validation Pipeline

### 3.1 Strict Schema Boundaries
All inbound data (user input, local storage reads, network responses, imported files) must pass through a Zod parse boundary:

```typescript
// Architectural pattern example
import { z } from 'zod';

export const TelemetryMetricSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.number().int().positive(),
  metricKey: z.string().min(1),
  value: z.number(),
  unit: z.enum(['percent', 'ms', 'MB', 'count']),
  status: z.enum(['nominal', 'warning', 'critical']),
});

export type TelemetryMetric = z.infer<typeof TelemetryMetricSchema>;
```

### 3.2 State Categorization
- **Ephemeral UI State:** Kept in component `useState` (e.g., hover states, local open/closed toggles).
- **Global Operational State:** Managed in `Zustand` with granular selectors to eliminate unnecessary renders (e.g., active view, grid perspective coordinates, sound/vibe settings).
- **Server/Cached State:** Managed in `TanStack Query` with explicit `staleTime`, `gcTime`, and deterministic mutation rollbacks.
- **Persistent State:** Synchronized through a Repository Pattern into `localStorage` / `IndexedDB` with schema migration versioning.

### 3.3 State Mutation & Optimistic Updates
Optimistic updates are permitted **only** for low-risk, reversible user actions (e.g., toggling a task checkbox or renaming a goal). Failed mutations trigger immediate rollbacks with non-blocking toast notifications.

---

## 4. Multi-Tier Rendering Strategy

To deliver a cinematic visual experience without killing mobile battery or degrading framerates, X-29 utilizes an adaptive multi-tier rendering pipeline:

```text
           [ Device & Feature Capability Probe ]
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
   [ High-Capability GPU ]           [ Constrained / Mobile ]
            │                                 │
   • Three.js R3F Canvas             • Pure CSS 3D Matrix
   • Real-time Depth Shader          • 2D Dynamic Vector Grid
   • Instanced Orbital Meshes        • Canvas 2D Sparklines
   • Smooth Variable Damping         • Instant CSS Easing
   • 60 FPS Dynamic Loop             • On-Demand Static Renders
```

### 4.1 3D Canvas Isolation
The 3D canvas (Infinite Grid & Orbital Graph) runs in a dedicated background layer with:
- `pointer-events: none` by default, passing clicks directly to floating HTML elements unless spatial interaction mode is explicitly engaged.
- `frameloop="demand"` when scenes are idle, activating continuous RAF rendering only during active camera orbits, cursor tracking, or layout transitions.
- Automatic throttling when the browser tab loses visibility (`document.hidden`).

### 4.2 DOM Overlay Layer
All functional text, tables, buttons, form controls, and accessible screen-reader elements exist inside standard semantic HTML elements, floating above the spatial plane.

---

## 5. Performance Budget & Telemetry Contracts

| Dimension | Target Budget | Enforcement Mechanism |
| :--- | :--- | :--- |
| **Initial Bundle Size** | < 180 KB (gzipped) | Dynamic code splitting (`React.lazy` on 3D scenes & heavy charts). |
| **Animation Framerate** | Solid 60 FPS (≥ 55 FPS) | GSAP ticker synchronization, `will-change` on transformed layers, RAF pacing. |
| **Memory Footprint** | < 85 MB heap in idle | Disposal of Three.js geometries/materials on component unmount; strict ring-buffers on live chart logs. |
| **Input Response (INP)** | < 60 ms | Offloading heavy filtering to Web Workers; debounced search inputs. |
| **Accessibility Score** | 100 on Lighthouse | Semantic tags, high contrast text tokens, aria labels on icon buttons. |
