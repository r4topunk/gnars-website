---
name: design_system_overview
description: Design system setup for gnars-website — Tailwind v4, shadcn/ui, theming, fonts, animation libraries
type: project
---

## Stack

- Tailwind CSS v4 with CSS-first config (`@theme inline {}` in `src/app/globals.css`)
- shadcn/ui New York style, RSC enabled, components at `src/components/ui/`
- Fonts: Geist Sans + Geist Mono via `next/font/google`, CSS vars `--font-geist-sans` / `--font-geist-mono`
- Color tokens: OKLCH-based CSS variables, full dark mode via `.dark {}` class
- Animations: GSAP (used in TextType.tsx for cursor blink), tw-animate-css imported globally
- Icons: Lucide React (primary) + `react-icons/fa` (FaEthereum in TV/Members — secondary library)
- `cn()` from `@/lib/utils` used consistently

## Theme tokens (light/dark)

All colors use OKLCH. Design tokens map through `@theme inline` to Tailwind utilities.
Dark mode applied via `.dark` class (ThemeProvider with `attribute="class"`).

## Layout

- Root layout: sticky header `DaoHeader`, `<main className="max-w-6xl mx-auto px-4">`
- Header height: `h-16`, `z-50`, `backdrop-blur`
- `DaoSidebar.tsx` exists but appears unused in current layout (DaoHeader is active)

## Key patterns established

- Vote badges use hardcoded Tailwind color classes (`bg-green-100 text-green-800 dark:bg-green-900/30`)
- Progress bars use inline `style={{ width: '${pct}%' }}` for dynamic widths — correct approach
- 3D card flip utility classes in `globals.css @layer utilities`
- Leaflet map overrides in `globals.css @layer base`

**Why:** CSS-first Tailwind v4 with design tokens — no tailwind.config.ts file exists, all config in globals.css.
**How to apply:** Never create tailwind.config.ts. Use `@theme inline` or `@layer utilities` for custom tokens/utilities.
