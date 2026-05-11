---
name: i18n foundation completed
description: next-intl Phase 1 foundation wired — routing, request config, nav helpers, [locale] route move, proxy merge, 50 message stubs, LocaleSwitcher, DaoHeader wiring
type: project
---

Phase 1 (foundation) of i18n EN+PT-BR is complete as of 2026-05-11.

**Why:** Spec `docs/superpowers/specs/2026-05-11-i18n-en-ptbr-design.md`, plan `docs/superpowers/plans/2026-05-11-i18n-en-ptbr.md`. Single worktree `quirky-cray-b26c80`, single PR to main.

**What was done:**
- `pnpm add next-intl` installed
- `src/i18n/routing.ts`, `src/i18n/request.ts` (static loader map), `src/i18n/navigation.ts` created
- `next.config.ts` wrapped with `withNextIntl`
- All UI routes moved from `src/app/` to `src/app/[locale]/` via `git mv` (api/, md/, opengraph-image.tsx, robots.ts, sitemap.xml/, miniapp-image/, favicon.ico, globals.css stay at root)
- `src/app/[locale]/layout.tsx` adapted: async, await params, hasLocale guard, setRequestLocale, NextIntlClientProvider, generateStaticParams
- `src/proxy.ts` replaced: intlMiddleware + stripLocale helper + markdown rewrite coexist
- `import Link from "next/link"` → `import { Link } from "@/i18n/navigation"` across [locale]/** and components/**
- `useRouter`/`usePathname`/`redirect` from `next/navigation` → `@/i18n/navigation` in affected client components; `notFound`/`useSearchParams` stay native
- `messages/en/` and `messages/pt-br/` each have 25 stub `{}` JSON files
- `messages/en/nav.json` and `messages/pt-br/nav.json` have `languageSwitcherLabel` key
- `src/components/layout/LocaleSwitcher.tsx` built with Languages icon + DropdownMenu
- `DaoHeader.tsx` wired: LocaleSwitcher next to ThemeToggle in HeaderActions (desktop); in SheetFooter (mobile)
- `docs/i18n/tone-brief.md` written; `docs/INDEX.md` updated

**How to apply:** Next phases (extraction, translation, SEO) build on top. Static loader map in `request.ts` is intentional — bundler-safe alternative to dynamic import string.
