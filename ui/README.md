# @lifeos/ui

Shared LifeOS UI primitives and design tokens for the web and native apps.

Primitives keep one public API and Tailwind token vocabulary. Platform-specific
renderers are used only where DOM elements and native views differ. Add shared
components here instead of duplicating their visual contract in an app.

## Variants with CVA

Shared component variants live beside their component in a `*Variants.ts`
file and use `class-variance-authority` (`cva` and `VariantProps`). Both the
web and React Native renderers consume the same recipe; add variant axes there
instead of creating platform-specific class maps. Recipes are exposed through
`@lifeos/ui/button-variants` and `@lifeos/ui/switch-variants`. Use `cn()` from
`@lifeos/ui/classnames` to merge recipe output with explicit utility overrides.

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

## Switch contract

Import `Switch` from `@lifeos/ui/switch`. It is a controlled switch: pass an
accessible label, `checked`, `onCheckedChange`, and optionally `disabled`,
`size` (`sm` or `md`), and `className`. Both platforms share the same checked,
disabled, and size CVA recipes; web exposes `role="switch"` and native exposes
the equivalent switch accessibility role and state.
