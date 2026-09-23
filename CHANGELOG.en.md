# 0.13.8

- Protected passkey API requests now return proper JSON instead of a 500 error when no session exists.

# 0.13.7

- The passkey management page is now served correctly as a React SPA by the local HTTPS proxy.

# 0.13.6

- Mobile passkey sign-in now starts the WebAuthn prompt automatically after secure preparation.
- The manual passkey button remains available as a fallback.

# 0.13.5

- The native splash screen no longer blocks the iOS app after the bundle starts.
- The mobile root view now uses a stable native flex layout again.

# 0.13.4

- The native iOS development client now loads the mobile bundle reliably through Expo Metro.
- Long blank startup screens on iOS were fixed.

# 0.13.3

- Mobile screens no longer collapse to an empty area on small displays.
- The native splash screen stays visible until session restoration finishes.

# 0.13.2

- Tailscale MagicDNS hosts are now accepted for local HTTPS development.

# 0.13.1

- The local Vite server now accepts Bonjour hosts for HTTPS testing.

# 0.13.0

- Local HTTPS setup for WebAuthn and passkey testing is documented.
- Added a Caddy development proxy for Mac and iPhone testing.

# 0.12.0

- Passkey sign-in can be enabled or disabled per account.
- LifeOS shows the configured WebAuthn origin and warns when HTTPS is missing.
- Self-hosted HTTPS and passkey requirements are documented.

# 0.11.0

- Passkeys now work on web and iOS with Apple, 1Password, and compatible password managers.

# 0.10.0

- The iOS app supports secure two-factor setup, confirmation, and account management.

# 0.9.0

- The native Nutrition screen shows meals and daily targets and can log meals directly.

# 0.8.0

- The native Finance screen creates accounts and records income and expenses with a monthly overview.

# 0.7.0

- Web and mobile navigation now use consistent icons for each section.

# 0.6.0

- The Fitness app shows training and body progress and saves new measurements to your LifeOS server.

# 0.5.0

- The Today dashboard brings together daily Finance, Fitness, Nutrition, and routine summaries.
- Web and mobile now share UI primitives and Tailwind design tokens.

# 0.4.1

- Mobile sign-in requests the authenticator code only after the password is verified.

# 0.4.0

- Selected Apple Health data can now sync privately from the iOS app to your LifeOS server.

# 0.3.0

- Encrypted local backups run automatically and can be restored.
- Mobile sessions use short-lived access tokens and rotating, revocable refresh tokens.
- The iPhone and iPad app now offers secure sign-in and native navigation.

# 0.2.0

- LifeOS data can now be exported as a ZIP archive.
- Accounts and personal data can be permanently deleted after password and email confirmation.
- Assets can now be tracked in a net-worth overview.

# 0.1.0

- Module-boundary issues between Fitness, Nutrition, and Foundation were fixed.
