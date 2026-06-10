---
name: Dark mode theming
description: How dark mode works in this app (single next-themes system) and how dark: variant coverage was rolled out across pages.
---

# Dark mode in this app

## Single source of truth: next-themes
- `client/src/main.tsx` wraps `<App/>` in **`next-themes`** `ThemeProvider` (`attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange`). This is the ONLY controller of the `.dark` class on `<html>`, persisting to localStorage key `theme`.
- `client/src/contexts/ThemeContext.tsx` is a separate custom provider for **institution branding** (`themeName`, `data-theme` attr, `--color-*` vars, persists `theme-name`) and **section visibility** (`section-visibility`). It no longer touches dark mode at all — `mode`/`setMode`/`toggleMode`/`theme-mode` were removed.
- The visible Dark Mode toggle (Settings → Layout & Theme) uses next-themes' `useTheme` (imported as `useColorMode`): `resolvedTheme` for state, `setTheme` to flip. `main.tsx` migrates any legacy `theme-mode` value into `theme` once.

**Why this matters:** previously two systems both added/removed `.dark` and could fight; next-themes already won in practice. Now there is one owner. To force dark for a screenshot, set `defaultTheme="dark"` in `main.tsx`, restart the workflow (HMR keeps stale mount state), screenshot, then revert.

**Note:** the custom context's `--color-background/foreground/card/muted` inline vars were dead (referenced nowhere); removed with the dark handling. The `--color-primary*`/`--color-secondary*` branding vars are also unused by CSS/tailwind (branding colors come from the `themes` JS object in Sidebar), but were kept to stay conservative.

**How to apply:** Tailwind `darkMode: ["class"]`; shadcn tokens (`--background`, `--card`, etc.) have a `.dark` block in `client/src/index.css`. Prefer theme tokens (`bg-background`, `bg-card`, `text-muted-foreground`) over hardcoded grays so dark mode is automatic.

## dark: variant rollout
Pages historically used hardcoded light-only Tailwind utilities (`bg-white`, `text-gray-500/600`, `bg-gray-50/100`, `bg-green/red/orange-100`, `border-gray-200/300`, sticky `bg-white` headers, `hover:bg-gray-50`) with no `dark:` counterpart. The fix pattern (mirroring `client/src/pages/certifications/index.tsx`) is to append the matching `dark:` variant per token: neutrals → `dark:bg-card` / `dark:bg-gray-800/900` / `dark:text-gray-300/400` / `dark:border-gray-700`; status badges → `bg-<c>-100 text-<c>-800` → add `dark:bg-<c>-950 dark:text-<c>-300`. Status color meaning (green/orange/red/gray) is preserved in both themes. A token-aware codemod that skips tokens already having a same-prefix dark variant (including variant-prefixed ones like `hover:`) does this safely and idempotently across the whole client.
