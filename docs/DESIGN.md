# Project-X / X-29 — Design Constitution & Visual Systems

> **Status:** Ratified  
> **Aesthetic Archetype:** Futuristic • Premium • Cinematic • Spatial • Intelligent • Minimal • Technical  
> **Metaphor:** Deep-Space Command Deck / Spatial Personal Operating System

---

## 1. Core Visual Philosophy

Project-X / X-29 does not emulate physical office stationery or flat web pages. It is an **instrument-grade spatial digital environment**. 

The UI surfaces exist on coordinated elevation planes floating in front of an infinite dark geometric grid. Every element balances extreme optical refinement (subtle hairline borders, dark translucency, soft ambient occlusion) with high information utility.

```text
┌────────────────────────────────────────────────────────┐
│                        VIEWPORT                        │
│                                                        │
│   Layer 4: Modal & Command HUD (z-index: 50, elevate)  │
│         ▲                                              │
│   Layer 3: Floating Workbenches (z-index: 20, z: 24px) │
│         ▲                                              │
│   Layer 2: Tactical HUD & Dock (z-index: 10, z: 8px)   │
│         ▲                                              │
│   Layer 1: Spatial 3D Plane / Orbital Nodes (z: 0px)   │
│         ▲                                              │
│   Layer 0: Infinite Perspective Grid & Atmospheric Glow│
└────────────────────────────────────────────────────────┘
```

---

## 2. Core Background — The Infinite Grid System

The baseline environment creates the physical sensation of infinite space without visual distraction:

### 2.1 Environmental Anatomy
1. **The Grid Plane:** An ultra-fine, high-density vector grid ($16\text{px} \times 16\text{px}$ minor divisions, $64\text{px} \times 64\text{px}$ major divisions, delivering a 4x increase in cell count) receding into atmospheric fog and spanning 100% full monitor width.
2. **Atmospheric Lighting:** A centered or cursor-tethered radial gradient providing a soft, deep cyan-violet glow (`rgba(99, 102, 241, 0.065)` fading to base obsidian `#0B0D13`).
3. **Continuous Auto-Animations:** Gentle, continuous coordinate drift (16s/48s loops) coupled with a periodic sweeping radar scan beam (12s) and ambient radial breathing (8s), suspended when `prefers-reduced-motion` is active.

### 2.2 Visual Restraint Guidelines
- **Grid Opacity:** Never exceed $8\%$ to $14\%$ opacity on primary lines and $3\%$ to $5\%$ on secondary lines.
- **No Neon Flares:** The grid provides spatial grounding, not a dance-floor laser show. The content always commands higher visual priority than the environment.

---

## 3. The Floating Element System

UI cards and workspaces are treated as physical spatial slabs hovering over the coordinate grid.

### 3.1 Spatial Depth Matrix

| Elevation Layer | Translation Z | Backdrop Blur | Border Treatment | Shadow Specification |
| :--- | :--- | :--- | :--- | :--- |
| **Layer 0 (Canvas)** | $0\text{px}$ | None | None | None |
| **Layer 1 (Sub-Panel)** | $+4\text{px}$ | $8\text{px}$ | `1px solid rgba(255,255,255,0.06)` | `0 4px 20px -2px rgba(0,0,0,0.5)` |
| **Layer 2 (Primary Deck)** | $+12\text{px}$ | $16\text{px}$ | `1px solid rgba(255,255,255,0.10)` | `0 12px 36px -4px rgba(0,0,0,0.65)` |
| **Layer 3 (Focused Card)** | $+24\text{px}$ | $24\text{px}$ | `1px solid rgba(130,170,255,0.25)` | `0 20px 50px -6px rgba(0,0,0,0.8), 0 0 25px rgba(56,189,248,0.15)` |
| **Layer 4 (Command HUD)** | $+48\text{px}$ | $32\text{px}$ | `1px solid rgba(255,255,255,0.18)` | `0 32px 72px -8px rgba(0,0,0,0.9)` |

### 3.2 Hover Lift Behavior
When the pointer hovers over a floating surface:
- Smooth transform elevation: `translateY(-3px) scale(1.005)`.
- Border illumination: Border transitions from neutral hairline to accented glow (`rgba(56, 189, 248, 0.3)`).
- Damping: Smooth cubic-bezier transition (`cubic-bezier(0.16, 1, 0.3, 1)` over $240\text{ms}$).

---

## 4. Surface Language & Materials

Surface materials avoid generic frosted glass tropes:
1. **Dark Obsidian Core:** Dark translucent backgrounds (`rgba(10, 14, 23, 0.72)`) that maintain deep contrast with white text.
2. **Hairline Edge Highlighting:** Precision gradient borders featuring a directional top-down highlight: `linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.03) 100%)`.
3. **Selective Glass:** Glassmorphism is reserved strictly for floating headers, contextual command palettes, and inspection sidecars. Data tables and charts use opaque-matte slabs to prevent text bleeding.

---

## 5. Typographic System

The typography communicates technical rigor and effortless scanning:

### 5.1 Type Families
- **Interface & System:** Modern geometric sans-serif (`Inter`, `system-ui`, `-apple-system`, `sans-serif`) with calibrated tracking.
- **Technical & Telemetry Data:** Monospace (`JetBrains Mono`, `ui-monospace`, `SF Mono`, `monospace`) for timestamps, coordinates, metrics, values, and status codes.

### 5.2 Hierarchy & Scale

| Token | Size | Weight | Tracking | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `display-2xl` | $36\text{px}$ / $2.25\text{rem}$ | 700 | `-0.03em` | Primary workspace titles, orbital headers |
| `display-xl` | $28\text{px}$ / $1.75\text{rem}$ | 600 | `-0.025em` | Deck names, modal headers |
| `metric-hero` | $32\text{px}$ / $2.0\text{rem}$ | 700 (Mono) | `-0.02em` | Large telemetry numbers, KPI values |
| `heading-lg` | $20\text{px}$ / $1.25\text{rem}$ | 600 | `-0.015em` | Card section titles |
| `body-md` | $14\text{px}$ / $0.875\text{rem}$ | 400 | `normal` | General descriptions, content copy |
| `label-sm` | $11\text{px}$ / $0.6875\text{rem}$ | 500 (Caps) | `+0.06em` | Field tags, telemetry categories, status pills |
| `code-xs` | $10\text{px}$ / $0.625\text{rem}$ | 400 (Mono) | `+0.02em` | Micro timestamps, system hashes |

---

## 6. Iconography System

1. **Family:** Lucide Icons / Custom Streamlined SVG.
2. **Stroke Uniformity:** Strict $1.5\text{px}$ stroke width for standard icons ($1.25\text{px}$ for micro HUD indicators).
3. **Color Pairing:** Icons inherit parent text color tokens or display dedicated semantic states (Cyan for active, Emerald for nominal, Amber for caution).
4. **Accessible Labels:** Every standalone icon button must include an `aria-label` or visually hidden screen reader text.

---

## 7. Motion & Choreography System

Motion serves navigation and spatial continuity:

### 7.1 Micro-Interaction Curves
- **Standard Easing:** `cubic-bezier(0.16, 1, 0.3, 1)` (fluid spring decelerate).
- **Press Interaction:** $80\text{ms}$ duration, `scale(0.97)`.
- **Panel Opening:** $220\text{ms}$ duration with staggered child entry ($30\text{ms}$ offset).

### 7.2 Choreographed Entrances
- Panels slide into the viewport along their spatial axis with an initial opacity fade from $0 \rightarrow 1$ and a scale change from $0.98 \rightarrow 1.00$.
- Route transitions utilize coordinated View Transitions or cross-fades without screen blanking.

---

## 8. Advanced Data Visualization Standards

Data visualizations in X-29 are active telemetry instruments:
- **Responsive Layout:** ECharts canvases automatically resize with zero visual distortion.
- **Crosshair Scrubbing:** Moving across time-series charts renders coordinated crosshair lines and instant value readouts across connected charts.
- **Threshold Gradients:** Area charts fill with subtle vertical gradient masks, highlighting values exceeding threshold boundaries.
- **Micro-Sparklines:** Inline tabular metrics feature self-contained SVG sparklines with trend directions and min/max bounds.

---

## 9. 3D & Spatial Visualization System

- **Orbital Goal Hierarchy:** Nodes render as glowing spheres orbiting a central core with parametric gravity curves. Inter-goal dependencies render as glowing spline links.
- **Camera Orchestration:** Smooth camera fly-to animations when selecting an orbital node, centering the node and opening an inspection drawer.
- **GPU Throttling:** Three.js RAF pauses when camera is static; geometries reuse shared buffers. Complete fallback to SVG/CSS on mobile.
