# i18n: English + Brazilian Portuguese (UI shell)

_Status:_ design approved, awaiting plan.
_Owner:_ orchestrator (Claude) + frontend-engineer/general-purpose subagents.
_Date:_ 2026-05-11.
_Worktree:_ `quirky-cray-b26c80` (single PR target).

## Goal

Ship a fully bilingual UI shell (English + Brazilian Portuguese) for the Gnars DAO website without changing onchain content, blog post bodies, or breaking existing inbound links.

## Non-goals

- Translating onchain content (proposal titles/descriptions, member ENS, auction names, droposal metadata, coin titles). Stays as-authored.
- Translating the 56 blog post bodies in `src/content/blog/*.md`. Blog **shell** (list page, filters, headings) is translated; post bodies remain English.
- Translating markdown emitted by the `/md/*` proxy route. AI consumers receive English.
- Translating Farcaster miniapp embed (no per-locale variants in the Farcaster protocol today).
- Supporting locales beyond `en` and `pt-br` in v1. Design must leave room for more without restructuring.

## Success criteria

1. Every visible English string in the routes under `src/app/[locale]/**` and `src/components/**` has a corresponding PT-BR translation. Audit grep passes.
2. `/` continues to serve English (no prefix). `/pt-br/...` serves Portuguese. Existing inbound URLs (`/proposals/119`, `/about`, blog redirects, miniapp embeds) are unbroken.
3. A `<LocaleSwitcher>` in `DaoHeader` (desktop dropdown and mobile sheet) flips locales and persists choice in the `NEXT_LOCALE` cookie. Returning PT-BR visitors landing on `/` are redirected to `/pt-br/` via middleware.
4. `next-intl` middleware + the existing markdown-rewrite logic coexist inside `src/proxy.ts`.
5. `hreflang` + `alternates.languages` correct on every public route; sitemap emits both locales.
6. `pnpm lint` clean, `pnpm format:check` clean. Dev server renders both locales without runtime errors. Cookie persistence verified manually.
7. Static rendering preserved: `generateStaticParams` returns both locales for `[locale]` routes; `setRequestLocale` called in every server page/layout that consumes translations.

## Decisions (locked)

| #   | Decision                                                                                                 | Reason                                                                                                                                           |
| --- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Scope: **UI shell only**                                                                                 | Onchain content is canonical and shouldn't be machine-translated; blog post translation is a separate body of work.                              |
| 2   | Routing: **subpath, `localePrefix: "as-needed"`**                                                        | `/` stays English (no prefix); `/pt-br/*` for Portuguese. Preserves all inbound URLs, miniapp config, existing redirects. SEO via `hreflang`.    |
| 3   | Library: **`next-intl`**                                                                                 | Only mature App Router + subpath solution. Server/client component split, typed messages, ICU plurals, navigation helpers, metadata integration. |
| 4   | Translation generation: **auto-translate with tone brief, human spot-check**                             | Native speaker (user) encodes preferences once; agents produce credible first pass; orchestrator reviews highlights.                             |
| 5   | Default locale at `/`: **English unprefixed; PT-BR returning visitors redirected via cookie middleware** | No URL breakage; returning PT-BR users get the right locale without manual switching.                                                            |
| 6   | Rollout: **single PR, single worktree, multiple subagents**                                              | Per user direction. Conflict avoidance via disjoint file ownership + per-namespace JSON files.                                                   |
| 7   | Messages organization: **per-namespace JSON files merged at runtime in `i18n/request.ts`**               | Avoids merge conflicts on one giant `en.json` when multiple agents work in parallel.                                                             |

## Architecture

### Stack additions

- `next-intl` (only new dep, latest stable compatible with Next 16.2.4 + React 19.2.5).

### Directory shape

```
src/
├── app/
│   ├── [locale]/
│   │   ├── layout.tsx            # NextIntlClientProvider + setRequestLocale + generateStaticParams
│   │   ├── page.tsx              # was src/app/page.tsx
│   │   ├── about/page.tsx
│   │   ├── auctions/             # all existing routes moved here
│   │   ├── proposals/
│   │   ├── propose/
│   │   ├── tv/
│   │   ├── members/
│   │   ├── treasury/
│   │   ├── feed/
│   │   ├── propdates/
│   │   ├── droposals/
│   │   ├── swap/
│   │   ├── coin-proposal/
│   │   ├── create-coin/
│   │   ├── mural/
│   │   ├── map/
│   │   ├── installations/
│   │   ├── community/
│   │   ├── blogs/
│   │   ├── [slug]/
│   │   ├── nogglesrails/
│   │   ├── debug/
│   │   └── demo/
│   ├── api/                      # stays at root (locale-agnostic)
│   ├── md/                       # stays at root (markdown proxy target)
│   ├── opengraph-image.tsx       # root OG stays neutral
│   ├── robots.ts
│   ├── sitemap.xml/
│   ├── miniapp-image/
│   └── favicon.ico
├── i18n/
│   ├── routing.ts                # locales, defaultLocale, localePrefix
│   ├── request.ts                # getRequestConfig — merges messages/<locale>/*.json
│   └── navigation.ts             # locale-aware Link, redirect, useRouter, usePathname
├── proxy.ts                      # next-intl middleware + existing markdown rewrite
└── messages/
    ├── en/
    │   ├── common.json
    │   ├── nav.json
    │   ├── footer.json
    │   ├── wallet.json
    │   ├── home.json
    │   ├── about.json
    │   ├── proposals.json
    │   ├── propose.json
    │   ├── propdates.json
    │   ├── auctions.json
    │   ├── tv.json
    │   ├── members.json
    │   ├── treasury.json
    │   ├── feed.json
    │   ├── droposals.json
    │   ├── swap.json
    │   ├── coinProposal.json
    │   ├── createCoin.json
    │   ├── mural.json
    │   ├── map.json
    │   ├── installations.json
    │   ├── bounties.json
    │   ├── blogs.json
    │   ├── errors.json
    │   └── metadata.json
    └── pt-br/
        └── … (mirror of en/)

docs/i18n/
└── tone-brief.md                 # translator tone document
```

### `src/i18n/routing.ts`

```ts
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "pt-br"],
  defaultLocale: "en",
  localePrefix: "as-needed",
});
```

### `src/i18n/request.ts`

```ts
import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

const NAMESPACES = [
  "common",
  "nav",
  "footer",
  "wallet",
  "home",
  "about",
  "proposals",
  "propose",
  "propdates",
  "auctions",
  "tv",
  "members",
  "treasury",
  "feed",
  "droposals",
  "swap",
  "coinProposal",
  "createCoin",
  "mural",
  "map",
  "installations",
  "bounties",
  "blogs",
  "errors",
  "metadata",
] as const;

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  const entries = await Promise.all(
    NAMESPACES.map(async (ns) => {
      const mod = await import(`@/messages/${locale}/${ns}.json`);
      return [ns, mod.default] as const;
    }),
  );

  return {
    locale,
    messages: Object.fromEntries(entries),
  };
});
```

### `src/i18n/navigation.ts`

```ts
import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
```

### `src/proxy.ts` (merged)

```ts
import createIntlMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "@/i18n/routing";

const intlProxy = createIntlMiddleware(routing);

const MARKDOWN_PATHS = ["/", "/proposals"];
const MARKDOWN_DYNAMIC_PATTERNS = [/^\/proposals\/[^/]+$/];

function stripLocale(pathname: string): string {
  for (const locale of routing.locales) {
    if (locale === routing.defaultLocale) continue;
    if (pathname === `/${locale}`) return "/";
    if (pathname.startsWith(`/${locale}/`)) return pathname.slice(`/${locale}`.length);
  }
  return pathname;
}

function isMarkdownPath(pathname: string): boolean {
  const stripped = stripLocale(pathname);
  if (MARKDOWN_PATHS.includes(stripped)) return true;
  return MARKDOWN_DYNAMIC_PATTERNS.some((p) => p.test(stripped));
}

export function proxy(request: NextRequest): NextResponse {
  const accept = request.headers.get("accept") ?? "";
  if (accept.includes("text/markdown") && isMarkdownPath(request.nextUrl.pathname)) {
    const stripped = stripLocale(request.nextUrl.pathname);
    const mdPath = stripped === "/" ? "/md" : `/md${stripped}`;
    return NextResponse.rewrite(new URL(mdPath, request.url));
  }
  return intlProxy(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|md|.*\\..*).*)"],
};
```

### Root layout (`src/app/[locale]/layout.tsx`)

```tsx
import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";

// … existing provider imports

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();
  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <NextIntlClientProvider messages={messages}>
          {/* existing provider tree, DaoHeader, SiteFooter, etc. */}
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

`metadata` export becomes `generateMetadata({ params })` so titles/descriptions can be localized.

### `<LocaleSwitcher>` (in `DaoHeader`)

- Desktop: `Globe` icon button → dropdown with `EN | PT-BR`. Active locale highlighted.
- Mobile: entry in the existing `Sheet` menu.
- Uses `useLocale()` to read current, `useRouter()` (from `@/i18n/navigation`) + `usePathname()` to navigate to the same route in the chosen locale.
- `router.replace(pathname, { locale: nextLocale })` — `next-intl`'s wrapped router automatically updates the `NEXT_LOCALE` cookie so middleware honors the choice on subsequent visits. No manual cookie writes needed.

## Next.js 16 specifics (rules for every subagent)

1. **`params` is `Promise<…>`** in Server Components, layouts, and `generateMetadata`. Always `await params`. No synchronous destructuring.
2. **`proxy.ts`, not `middleware.ts`**. Next 16 convention. Already in use.
3. **React Compiler is on** (`reactCompiler: true`). Do NOT add `useMemo`/`useCallback` around translations or locale-derived values. The compiler handles memoization; manual memoization fights it.
4. **Server vs Client translations**:
   - Server Component: `const t = await getTranslations("namespace")` from `next-intl/server`.
   - Client Component (`"use client"` at top): `const t = useTranslations("namespace")` from `next-intl`.
5. **Navigation imports** inside `app/[locale]/**` and any component used within it: import `Link`, `redirect`, `useRouter`, `usePathname` from `@/i18n/navigation`, NOT from `next/link`/`next/navigation`. API routes keep the native imports.
6. **`setRequestLocale(locale)`** at the top of every server page/layout under `[locale]` that uses translations. Required for proper static rendering.
7. **`useUserAddress()` and other custom wallet hooks** are unaffected — they don't read params.
8. **API routes are locale-agnostic**. Do not move them under `[locale]`. Do not import from `next-intl/server` in API routes.

## Translation tone brief (`docs/i18n/tone-brief.md`)

Subagents pass this brief to themselves and use it for every PT-BR string.

### Pronouns + register

- Use **`você`**, never `tu` (universal across Brazil).
- Default register: **informal, friendly, skater-adjacent**.
- Escalate to **formal/precise** in: governance flows (voting, delegation, treasury, transaction signing, error messages from chain), security-critical UI (wallet connection, key management, AA onboarding).
- Marketing/hero copy: leaning toward gírias when natural. The existing `é foda pra caralho!` line in `HOMEPAGE_DESCRIPTIONS` is in the target tone — don't sanitize that energy out.

### Web3 / DAO vocabulary (KEEP IN ENGLISH on both locales)

Even in PT-BR strings, leave these terms in English (Brazilian Web3 community uses them as English loanwords):

`mint`, `bid`, `propose`, `proposal`, `vote`, `delegate`, `delegation`, `gnar`, `gnars`, `droposal`, `wallet`, `gas`, `treasury`, `governance`, `auction`, `airdrop`, `swap`, `bridge`, `stake`, `claim`, `feed`, `coin`, `token`, `holder`, `whale`, `floor`, `op stack`, `base`.

Verbs ARE translated when used as plain action labels (e.g., button "Vote" → "Vote", but "Click Vote to cast your ballot" → "Clique em Vote para registrar seu voto"). When in doubt, keep the noun in English and translate the surrounding sentence.

### Specific term mapping

| English                  | PT-BR               | Notes                          |
| ------------------------ | ------------------- | ------------------------------ |
| Connect wallet           | Conectar wallet     | keep "wallet"                  |
| Place bid                | Dar bid             | keep "bid"                     |
| Create proposal          | Criar proposal      | keep "proposal"                |
| Vote against             | Votar contra        |                                |
| Vote for                 | Votar a favor       |                                |
| Abstain                  | Abster              |                                |
| Loading…                 | Carregando…         |                                |
| Something went wrong     | Algo deu errado     |                                |
| Not found                | Não encontrado      |                                |
| Empty / nothing here yet | Nada por aqui ainda |                                |
| Skater                   | Skatista            | OK to localize                 |
| Community                | Comunidade          |                                |
| Members                  | Membros             |                                |
| Treasury                 | Treasury            | keep English (governance term) |
| Coin proposal            | Coin proposal       | wizard label, keep English     |
| Onchain                  | Onchain             | keep                           |
| Mainnet / Base           | Mainnet / Base      | keep                           |

### Style rules

- Preserve emoji and punctuation exactly. Don't drop `!` or convert `—` to `-`.
- Don't introduce new emojis the English source didn't have.
- ICU plurals: PT-BR has `one` and `other` (no `=0`/`few`/`many`/etc. needed); use `{count, plural, =0 {…} one {…} other {…}}` when source uses `=0`.
- Sentence case for UI buttons and labels matching English casing convention.
- Capitalize proper nouns (Gnars, Base, Ethereum, Zora, Farcaster).
- Avoid Portuguese-Portugal phrasings (no `utilizador`, no `telemóvel`, no `ecrã`).

### Examples (showing the tone)

| EN                                 | PT-BR (good)                          | PT-BR (bad)                                     |
| ---------------------------------- | ------------------------------------- | ----------------------------------------------- |
| Place bid                          | Dar bid                               | Fazer um lance                                  |
| You don't have enough voting power | Você não tem poder de voto suficiente | O senhor não dispõe de poder de voto suficiente |
| Loading proposals…                 | Carregando proposals…                 | A carregar propostas…                           |
| No proposals yet                   | Nenhum proposal ainda                 | Não há propostas ainda                          |
| Connect to bid                     | Conecta a wallet pra dar bid          | Por favor, conecte sua carteira                 |
| Funding skate culture worldwide    | Bancando a cultura skate pelo mundo   | Financiando a cultura do skate mundialmente     |

## Subagent orchestration plan

### Phase 1 — Foundation (BLOCKING; 1 agent, sequential)

Subagent type: `frontend-engineer`.

Tasks:

1. `pnpm add next-intl@latest`.
2. Create `src/i18n/{routing,request,navigation}.ts` exactly as specified above.
3. Move all routes from `src/app/` to `src/app/[locale]/` (EXCEPT: `api/`, `md/`, `opengraph-image.tsx`, `robots.ts`, `sitemap.xml/`, `miniapp-image/`, `favicon.ico`).
4. Adapt the moved root `layout.tsx` into `src/app/[locale]/layout.tsx` (add `await params`, `setRequestLocale`, `NextIntlClientProvider`, `generateStaticParams`).
5. Merge `next-intl` middleware into `src/proxy.ts` (locale-aware markdown stripping included).
6. Create `messages/en/` and `messages/pt-br/` with empty `{}` stubs for every namespace listed in `NAMESPACES`.
7. Replace `next/link` imports site-wide with `@/i18n/navigation` (mechanical; only in `src/app/[locale]/**` and components imported from there). Leave API routes alone.
8. Replace `next/navigation` `useRouter`/`usePathname`/`redirect` imports in client components with `@/i18n/navigation` versions.
9. Build `<LocaleSwitcher>` in `src/components/layout/LocaleSwitcher.tsx`. Wire into `DaoHeader` (desktop dropdown next to ThemeToggle, mobile sheet entry).
10. Write tone brief to `docs/i18n/tone-brief.md`.
11. Update `docs/INDEX.md` with new entries (architecture doc + tone brief).
12. `pnpm lint`, `pnpm format`, start dev server, confirm `/` renders (English), `/pt-br/` renders (English fallback while messages empty), switcher works, cookie set.

Acceptance: dev server boots, both URLs load, no console errors, lint+format clean.

### Phase 2 — Extraction (parallel, batched)

Subagent type: `frontend-engineer` per slice. Run in batches of up to 5 in parallel.

**Each agent's prompt receives**:

- Slice name + complete file ownership list (explicit paths).
- JSON namespace(s) it owns.
- Reference to `docs/i18n/tone-brief.md`.
- Hard rule: "DO NOT modify files outside your slice. DO NOT modify JSON files outside your owned namespace(s). If you need a string that already belongs to `common`, USE the existing key; if it doesn't exist, request it via comment in your output and the orchestrator will add it."
- Next 16 rules from the section above.
- Each agent only writes English keys to its `messages/en/<ns>.json`. PT-BR stays empty until Phase 3.

**Slice ownership** (no overlap):

| Slice                                    | Component / route files                                                                                                                                                                                                                                                                                                                                                                                                                                               | JSON namespaces owned                                     |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| **A — Layout**                           | `components/layout/{DaoHeader,SiteFooter,WalletDrawer,DelegationModal,AAOnboarding,ThemeToggle,LocaleSwitcher}.tsx`, `components/miniapp/**`, `components/tv/{MiniTV,MiniTVVisibilityContext}.tsx`, `components/home/{HomeFooter,NogglesCopyFooter}.tsx` (footer variants), wallet hook UX strings                                                                                                                                                                    | `nav`, `footer`, `wallet`                                 |
| **B — Common UI + Errors**               | `components/common/**` (except `FAQ.tsx`), `components/skeletons/**`, `components/ui/**` (only user-facing strings in those components; most are unstyled primitives with no copy), error/toast strings in `lib/proposal-utils.ts`, `lib/proposal-template-schemas.ts`, `lib/schemas/**`                                                                                                                                                                              | `common`, `errors`                                        |
| **C — Home + About**                     | `app/[locale]/page.tsx`, `components/home/**` (excl. footer variants from A), `components/hero/**`, `components/common/FAQ.tsx`, `app/[locale]/about/**`                                                                                                                                                                                                                                                                                                              | `home`, `about`                                           |
| **D — Auctions**                         | `app/[locale]/auctions/**`, `components/auctions/**`, `components/auction/**`                                                                                                                                                                                                                                                                                                                                                                                         | `auctions`                                                |
| **E — Proposals + Propose + Propdates**  | `app/[locale]/proposals/**`, `app/[locale]/propose/**`, `app/[locale]/propdates/**`, `components/proposals/**`, `components/propdates/**`                                                                                                                                                                                                                                                                                                                             | `proposals`, `propose`, `propdates`                       |
| **F — TV**                               | `app/[locale]/tv/**`, `components/tv/**` (excluding Mini\* from A)                                                                                                                                                                                                                                                                                                                                                                                                    | `tv`                                                      |
| **G — Members + Treasury**               | `app/[locale]/members/**`, `app/[locale]/treasury/**`, `components/members/**`, `components/treasury/**`                                                                                                                                                                                                                                                                                                                                                              | `members`, `treasury`                                     |
| **H — Coin / Swap / Feed / Droposals**   | `app/[locale]/coin-proposal/**`, `app/[locale]/create-coin/**`, `app/[locale]/swap/**`, `app/[locale]/feed/**`, `app/[locale]/droposals/**`, `components/coin-proposal/**`, `components/feed/**`, `components/droposals/**`, `components/snapshot/**`                                                                                                                                                                                                                 | `coinProposal`, `createCoin`, `swap`, `feed`, `droposals` |
| **I — Community surfaces + Blogs shell** | `app/[locale]/community/**`, `app/[locale]/installations/**`, `app/[locale]/map/**`, `app/[locale]/mural/**`, `app/[locale]/blogs/**` (list/filter/headings ONLY, post body untouched), `app/[locale]/nogglesrails/**`, `app/[locale]/[slug]/**`, `components/bounties/**`, `components/installations/**`, `components/blogs/**` (excluding post-body rendering), `components/nogglesrails/**`, `components/map-location-drawer.tsx`, `components/contracts-list.tsx` | `bounties`, `blogs`, `installations`, `map`, `mural`      |

**Batching strategy** (orchestrator runs):

1. Batch 1 (after Phase 1): A, B, C, D — 4 parallel agents.
2. Batch 2 (after Batch 1): E, F, G — 3 parallel agents.
3. Batch 3 (after Batch 2): H, I — 2 parallel agents.

Why not all 9 in parallel: protects orchestrator context window and reduces risk of two agents needing to coordinate on a shared `common` key simultaneously. Common namespace stabilizes in Batch 1; later batches just consume from it.

### Phase 3 — PT-BR translation (1 agent, sequential)

Subagent type: `general-purpose`.

Reads every `messages/en/*.json`, writes the matching `messages/pt-br/*.json` following the tone brief. No code changes. Single pass. Validates that every key in `en/` has a matching key in `pt-br/`.

### Phase 4 — SEO + metadata (1 agent)

Subagent type: `frontend-engineer`.

Tasks:

1. Convert every `export const metadata` in `[locale]/**/page.tsx` and `[locale]/**/layout.tsx` to `generateMetadata({ params })` using `getTranslations({ locale, namespace: 'metadata.<route>' })`.
2. Add `alternates: { canonical, languages }` to every route's metadata.
3. Update `src/app/sitemap.xml/route.ts` to emit both locales with `xhtml:link` alternates.
4. Update `src/app/robots.ts` to allow `/pt-br/*`.
5. Verify per-route `opengraph-image.tsx` files render with locale-aware text where they have copy.

### Phase 5 — Audit + verification (1 agent)

Subagent type: `superpowers:code-reviewer`.

Tasks (read-only, except for adding follow-up flags):

1. Grep for hardcoded English strings still present in `src/app/[locale]/**` and `src/components/**` (exclude shadcn primitives, `cn()` classNames, code comments, `aria-label` placeholders intentionally English).
2. Diff `messages/en/` and `messages/pt-br/` key sets — every key in `en` must exist in `pt-br`.
3. Verify zero `from "next/link"` and zero `from "next/navigation"` imports remain inside `src/app/[locale]/**` and `src/components/**` (API routes excluded).
4. Verify every `[locale]` server page/layout calls `setRequestLocale`.
5. Run `pnpm lint` and `pnpm format:check`.
6. Report findings; orchestrator addresses gaps with targeted follow-up before opening PR.

### Phase 6 — Manual smoke + PR

Orchestrator (not a subagent) runs `pnpm dev`, verifies:

- `/` renders English.
- `/pt-br` renders Portuguese.
- `/pt-br/proposals` renders Portuguese.
- Locale switcher works, cookie set, refresh persists.
- Returning to `/` with `NEXT_LOCALE=pt-br` cookie redirects to `/pt-br`.
- Existing inbound URL `/proposals/119` still redirects correctly.

Then `gh pr create` to `main` with PR body following CLAUDE.md template.

## Conflict avoidance rules (cross-agent)

1. **Disjoint file ownership**. Slice tables above are authoritative. If two slices both seem to claim a file, the orchestrator splits the file or reassigns before dispatching.
2. **Per-namespace JSON files**. Each slice writes only to its owned `messages/<locale>/<ns>.json`.
3. **`common.json` is shared, write-locked after Batch 1**. Slice B owns it through Batch 1. Later batches read from `common` but do not write to it; if they need a new common key, they request it in their report and orchestrator adds it before next batch.
4. **No `pnpm build`** unless explicitly verifying. Per CLAUDE.md rule.
5. **No `git push` from subagents**. Orchestrator opens the PR.
6. **No new dependencies** beyond `next-intl` without orchestrator approval.

## Risks & mitigations

| Risk                                                                                        | Likelihood | Impact                                      | Mitigation                                                                                                                               |
| ------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Auto-translation tone drifts (too formal or wrong gíria)                                    | Medium     | Medium (UX feel)                            | Tone brief + spot-check pass during Phase 6. User reviews a sample before PR.                                                            |
| Hidden hardcoded strings missed in extraction                                               | High       | Low-medium (English bleed-through in PT-BR) | Phase 5 audit grep. Iterate as needed.                                                                                                   |
| `[locale]` move breaks an inbound URL or test                                               | Medium     | High                                        | `localePrefix: "as-needed"` preserves all unprefixed URLs. Run existing Playwright tests in Phase 5. Manual smoke covers redirects.      |
| `proxy.ts` markdown rewrite breaks under locale prefix                                      | Medium     | Medium                                      | `stripLocale` helper in the proxy + matcher excludes `/md`. Verify `Accept: text/markdown` for both `/proposals` and `/pt-br/proposals`. |
| React Compiler interaction with next-intl context                                           | Low        | Low                                         | next-intl uses standard React context (compatible). Subagents instructed not to manually memoize.                                        |
| Bundle size growth                                                                          | Low        | Low                                         | All messages loaded at layout boundary (~30-50kb JSON gzipped). Acceptable for v1; can split per-route later if needed.                  |
| Onchain content visually mixed with PT-BR UI (proposal title in English inside PT-BR shell) | Certain    | Low                                         | Documented and accepted. Future enhancement: add a small `[EN]` badge or auto-translate proposal titles with a disclaimer. Out of scope. |
| Subagent dispatched in wrong batch leaves intermediate state                                | Low        | Medium                                      | Batches are sequential at the orchestrator level. Each batch's completion is verified before the next launches.                          |

## Out of scope (deferred)

- Blog post body translation (56 markdown files).
- Onchain content translation (proposal/auction/droposal/coin descriptions).
- Additional locales beyond PT-BR.
- Per-locale Farcaster miniapp embed (protocol limitation today).
- Locale-aware `/md/*` markdown variants.
- Currency formatting per locale (treasury values stay in USD with the user's preferred format; this is a separate concern).
- Number/date format polish via `Intl.NumberFormat` and `Intl.DateTimeFormat` — out of scope for v1 unless we discover obvious regressions during extraction; can be a quick follow-up.

## Open questions

None — all decisions locked during brainstorming. Implementation plan to be written next by `writing-plans`.
