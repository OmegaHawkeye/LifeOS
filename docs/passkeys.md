# Passkeys for self-hosted LifeOS

LifeOS uses Laravel Fortify and Laravel's WebAuthn passkey package. Passkey
ceremonies run on the LifeOS server's own web origin; Sanctum continues to
issue and authenticate native API tokens. LifeOS stores the public credential,
never the passkey's private key, and uses no hosted login relay or email flow.

## Server requirements

- Use HTTPS with a certificate trusted by each device. Browsers allow WebAuthn
  only in secure contexts, except for local development on `localhost`.
- Give the home server a stable hostname such as `lifeos.home.arpa` and keep the
  same hostname after enrolling passkeys. Avoid a changing LAN IP; `localhost`
  on an iPhone refers to the iPhone, not the server.
- Set `APP_URL`, `LIFEOS_PASSKEY_WEB_URL`, and
  `LIFEOS_PASSKEY_WEB_ORIGIN` to the LifeOS web URL, for example
  `https://lifeos.home.arpa`. The WebAuthn relying-party ID is its hostname
  (without scheme or port); the allowed origin includes scheme and any port.
- When developing with a separate Vite origin, configure that origin explicitly
  and include it in Sanctum's stateful domains and CORS origin settings.

## Credential storage and privacy

The operating system presents available passkey providers. The owner chooses
Apple Passwords/iCloud Keychain, 1Password, or another compatible credential
manager. Provider sync is controlled by that provider and the owner; it is not
a LifeOS data sync. Only the public key and passkey label are stored by LifeOS.

Mobile sign-in opens the server origin in the system authentication browser,
then returns a short-lived, one-time code protected with PKCE. The app exchanges
that code for its normal Sanctum access and refresh tokens. Passkey management
uses a separate three-minute, single-use browser handoff; its secret is placed
in a URL fragment and removed before redemption.
