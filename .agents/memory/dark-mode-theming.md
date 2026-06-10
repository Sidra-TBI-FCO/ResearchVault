---
name: Dark mode theming
description: How dark mode actually works in this app (dual theme system) and how dark: variant coverage was rolled out across pages.
---

# Dark mode in this app

## Two theme systems coexist
- `client/src/main.tsx` wraps `<App/>` in **`next-themes`** `ThemeProvider` with `attribute="class" defaultTheme="light"`. This is the real controller of the `.dark` class on `<html>`, and it persists the choice in localStorage (key `theme`).
- `client/src/contexts/ThemeContext.tsx` is a **separate custom** provider (institution branding, section visibility, plus its own `mode`/`toggleMode` that also adds/removes `.dark` and sets `--color-*` inline vars; persists key `theme-mode`).

**Why this matters:** when verifying dark mode, flipping the custom ThemeContext default alone does NOT reliably darken the page — next-themes can win. To force dark for a screenshot, set `defaultTheme="dark"` in `main.tsx`, restart the workflow (HMR keeps old useState/mount state, so a full restart is needed), then revert.

**How to apply:** Tailwind `darkMode: ["class"]`; shadcn tokens (`--background`, `--card`, etc.) have a `.dark` block in `client/src/index.css`. Prefer theme tokens (`bg-background`, `bg-card`, `text-muted-foreground`) over hardcoded grays so dark mode is automatic.

## dark: variant rollout
Pages historically used hardcoded light-only Tailwind utilities (`bg-white`, `text-gray-500/600`, `bg-gray-50/100`, `bg-green/red/orange-100`, `border-gray-200/300`, sticky `bg-white` headers, `hover:bg-gray-50`) with no `dark:` counterpart. The fix pattern (mirroring `client/src/pages/certifications/index.tsx`) is to append the matching `dark:` variant per token: neutrals → `dark:bg-card` / `dark:bg-gray-800/900` / `dark:text-gray-300/400` / `dark:border-gray-700`; status badges → `bg-<c>-100 text-<c>-800` → add `dark:bg-<c>-950 dark:text-<c>-300`. Status color meaning (green/orange/red/gray) is preserved in both themes. A token-aware codemod that skips tokens already having a same-prefix dark variant (including variant-prefixed ones like `hover:`) does this safely and idempotently across the whole client.
