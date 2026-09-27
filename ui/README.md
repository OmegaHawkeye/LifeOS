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
