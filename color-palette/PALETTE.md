# Project-X / X-29 — Design Token Color Palette

> **Status:** Ratified Master Token Standard  
> **Color Architecture:** Spatial Dark Grid & Semantic Telemetry  
> **Canvas Philosophy:** Deep Spatial Canvas (`#0B0D13`) + Infinite Technical Grid (`rgba(255,255,255,0.035)`) + Elevated Floating Slabs (`#131722`) + Strategic Semantic Accents

---

## 1. Fixed Core Semantic Palette

| Role | Token Key | Hex / RGBA | Canonical Usage | Contrast (vs Surface) |
| :--- | :--- | :--- | :--- | :--- |
| **Background** | `bg-void` | `#0B0D13` | Main dashboard base canvas & infinite environment | Base Canvas |
| **Card Surface** | `surface-card` | `#131722` | All container backgrounds, floating slabs, decks | Base Surface |
| **Card Border** | `border-card` | `#1F2637` | Subtle 1px borders & division hairlines | Outer Hairline |
| **Primary Accent** | `accent-primary` | `#6366F1` | Active navigation, primary buttons, key links | 6.8:1 |
| **Focus / Timer** | `accent-focus` | `#F59E0B` | Timer numbers, stopwatch controls, active focus indicator | 10.4:1 |
| **Success / Pace** | `signal-success`| `#10B981` | Positive progress, completed subjects, hit targets | 8.9:1 |
| **Warning / Critical** | `signal-warning`| `#F43F5E` | Missed days, deadline pressure, "Behind Pace" status | 6.4:1 |
| **Text Primary** | `text-primary` | `#F8FAFC` | Big metrics, headers, core statistics | 15.2:1 |
| **Text Muted** | `text-muted` | `#94A3B8` | Labels, dates, sub-metrics, secondary descriptions | 5.8:1 |

---

## 2. Spatial Grid & Environmental Tokens

| Role | Token Key | RGBA Value | Purpose & Visual Relationship |
| :--- | :--- | :--- | :--- |
| **Grid Base Line** | `grid-base` | `rgba(255, 255, 255, 0.035)` | Continuous subtle spatial coordinate mesh (32px divisions) |
| **Grid Accent Line** | `grid-accent` | `rgba(255, 255, 255, 0.060)` | Converging / major coordinate divisions (128px divisions) |
| **Atmospheric Glow**| `ambient-glow` | `rgba(99, 102, 241, 0.05)` | Subtle cursor-tethered / central radial depth illumination |
| **Surface Hairline** | `surface-edge` | `rgba(255, 255, 255, 0.060)` | Top-edge specular highlight for floating elevation |
| **Surface Translucent**| `surface-glass` | `rgba(19, 23, 34, 0.88)` | Floating panels over grid maintaining `#131722` appearance |
| **Elevation Shadow** | `shadow-float` | `0 16px 40px -8px rgba(0,0,0,0.7), 0 0 1px rgba(255,255,255,0.06)` | Visual separation of foreground card from background grid |

---

## 3. Strict Semantic Usage Rules

1. **Primary Accent (`#6366F1`):** Use strategically for active navigation, selected states, primary action buttons, and controlled glow. Never flood the screen with purple.
2. **Focus / Timer (`#F59E0B`):** Dedicated strictly to temporal controls, countdowns, active focus sessions, and time-sensitive warnings.
3. **Success / Pace (`#10B981`):** Used for target completion, positive velocity, green light status indicators, and ahead-of-pace states.
4. **Warning / Critical (`#F43F5E`):** Used strictly for missed deadlines, critical system errors, behind-pace alerts, and destructive actions. Never used for ordinary decoration.
5. **Zero Inline Hex Codes:** All styles and components must reference CSS variables or Tailwind tokens (`bg-[var(--color-bg)]`, `text-[var(--color-text-primary)]`, etc.).

---

## 4. CSS Custom Variables System

```css
:root {
  /* Core Semantic Palette */
  --color-bg: #0B0D13;
  --color-surface: #131722;
  --color-surface-elevated: #181d2b;
  --color-border: #1F2637;
  --color-border-subtle: rgba(255, 255, 255, 0.06);

  --color-accent-primary: #6366F1;
  --color-accent-primary-hover: #4f46e5;
  --color-accent-primary-glow: rgba(99, 102, 241, 0.18);

  --color-focus-timer: #F59E0B;
  --color-focus-timer-glow: rgba(245, 158, 11, 0.20);

  --color-success-pace: #10B981;
  --color-success-pace-glow: rgba(16, 185, 129, 0.20);

  --color-warning-critical: #F43F5E;
  --color-warning-critical-glow: rgba(244, 63, 94, 0.20);

  --color-text-primary: #F8FAFC;
  --color-text-muted: #94A3B8;
  --color-text-faint: #64748B;

  /* Spatial Grid Tokens */
  --grid-line-subtle: rgba(255, 255, 255, 0.035);
  --grid-line-converge: rgba(255, 255, 255, 0.060);
  --grid-spacing-sm: 32px;
  --grid-spacing-lg: 128px;

  /* Floating Elevation */
  --shadow-floating-slab: 0 16px 40px -8px rgba(0, 0, 0, 0.75), 0 0 1px 1px rgba(255, 255, 255, 0.05);
  --shadow-floating-lift: 0 24px 50px -10px rgba(0, 0, 0, 0.85), 0 0 20px -2px rgba(99, 102, 241, 0.15);
}
```
