# @lifeos/ui

Shared LifeOS UI primitives and design tokens for the web and native apps.

Primitives keep one public API and Tailwind token vocabulary. Platform-specific
renderers are used only where DOM elements and native views differ. Add shared
components here instead of duplicating their visual contract in an app.

## Button contract

Import `Button` from `@lifeos/ui/button`. Web and React Native share these
variants: `primary`, `secondary`, `tertiary`, `danger`, and `icon`. Set
`selected` for toggle choices and `loading` while an action is in progress.
Loading automatically disables the button, shows progress, and prevents
duplicate activation. Set `disabled` until required form fields are valid;
disabled styles remain visibly muted and never rely on transparency. Use
`type="submit"` for form actions and provide `accessibilityLabel` when an icon
has no visible text. Web adds a visible keyboard focus ring and a not-allowed
cursor; native exposes button, busy, selected, and disabled accessibility
states with press feedback.

## Design tokens and themes

`tokens.json` is the single source for colour, type, spacing, radius, shadow,
size and breakpoint tokens; it mirrors the LifeOS design system. After editing
it, run `pnpm --dir ui theme:generate` to rewrite the Tailwind v4 theme files,
which are never edited by hand:

- `theme.css`: shared `@theme` tokens with light values as defaults.
- `theme.web.css`: Dark and Wall overrides for the web. Dark follows the
  `.dark` class on the root; Wall follows `data-theme="wall"` and adds a
  `wall:` variant.
- `theme.native.css`: light, dark and wall blocks for Uniwind, which needs
  every theme to declare the same variables. `mobile/global.css` imports it by
  relative path so Uniwind can scan it before it defines the `wall` variant,
  and `mobile/metro.config.js` registers `wall` as an extra theme.

Use the token vocabulary in components: `bg-canvas`, `bg-surface`, `text-ink`,
`text-ink-muted`, `border-line-strong`, `bg-primary text-on-primary`,
`bg-finance-soft text-finance`, `text-body`, `text-label`, `text-figure-xl`,
`min-h-target-min`, `rounded-md`, `shadow-raised`, `tablet:` and `desktop:`.

The web app bundles Instrument Sans, Newsreader and IBM Plex Mono through
Fontsource, so no font loads from a third-party host. The iOS app embeds the
same families at build time with the `expo-font` config plugin in
`mobile/app.json`, so a font change needs a native rebuild (`pnpm ios`).
React Native has no inherited font, so on native each `text-*` style carries
its own family (`ui/tokens.json` → `type.nativeFamilies`); text without a
`text-*` style uses the system font.

## Components

Each component has one `*.types.ts` contract with `*.web.tsx` and
`*.native.tsx` renderers, exported by subpath.

| Import                         | Use                                                                                                                        |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `@lifeos/ui/button`            | Actions; see the contract above.                                                                                           |
| `@lifeos/ui/icons`             | `AppIcon`: 24px stroke icons, including module, trend, status and navigation glyphs.                                       |
| `@lifeos/ui/tag`               | A module, status or `now` label. Status tags always carry a word.                                                          |
| `@lifeos/ui/meter`             | Budget, macro and consistency progress with an optional target tick. The fill grows in on first render.                    |
| `@lifeos/ui/signal-card`       | One dashboard summary per module: figure, trend, next step and action. Cards rise in; pass `enterDelayMs` to stagger them. |
| `@lifeos/ui/segmented-control` | Two to four peer views or values. On web the thumb slides to the selection.                                                |
| `@lifeos/ui/switch`            | Settings that apply immediately. Stacked rows are separated by padding and a hairline.                                     |

Web animations respect `prefers-reduced-motion`; the native meter checks the
system's reduce-motion setting before animating. Native module icons take
their colour from `tokens.json` and follow light and dark only.
