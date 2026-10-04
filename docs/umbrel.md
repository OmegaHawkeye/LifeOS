# LifeOS on umbrelOS

The LifeOS community app store package installs LifeOS through the umbrelOS
interface. Personal data, the PostgreSQL database, application key, and backups
stay in LifeOS's local app data directory. LifeOS does not require a LifeOS
account or send dashboard data to LifeOS-operated services.

## Install without a terminal

1. In umbrelOS, open **App Store → Add a community app store**.
2. Enter `https://github.com/OmegaHawkeye/LifeOS.git` and add the **LifeOS**
   store.
3. Find **LifeOS** in the store and choose **Install**.
4. Open LifeOS from the umbrelOS home screen and finish the first-run owner
   setup in your browser.

LifeOS keeps its own sign-in screen, so Umbrel's extra app-proxy login is
disabled. The app remains behind Umbrel's app proxy; it does not publish a
separate host port.

## Local backups and updates

LifeOS retains successful daily backups for 30 days on the Umbrel device. The
current release requires a one-time recovery-key setup before encrypted backups
can succeed. After installation, open a terminal on the Umbrel server and run:

```sh
docker exec lifeos-lifeos_lifeos_1 php artisan lifeos:backup:key
```

Save the key somewhere separate from the server and backup drive. Until a
successful backup appears in LifeOS Settings, do not treat the installation as
backed up. A terminal-free recovery-key setup is still needed.

For protection from disk or server failure, also copy backups to a NAS or a
second external drive. That extra copy is recommended, not required.

Update LifeOS through the umbrelOS app update flow. The database and app storage
are kept outside the container image, so normal updates and restarts retain
them. Do not remove the app's data directory when updating.

**Uninstalling LifeOS removes its app data, including the database and local
backups.** Create and verify an external backup before uninstalling if you may
want the data later.

## Network and passkeys

The package makes no outbound LifeOS telemetry or analytics requests. It pulls
versioned application and PostgreSQL images from their public registries when
installed or updated. This is infrastructure traffic; dashboard data remains
local.

umbrelOS app links use HTTP by default. Browser sign-in works, but passkeys
require a secure HTTPS origin. Configure trusted HTTPS for your Umbrel host
before enabling or registering passkeys. Apple Health data continues to reach
LifeOS only through the user's paired iPhone app and local server connection.

## Maintainer notes

The community store ID is `lifeos` and the app ID is `lifeos-lifeos`.
`lifeos-lifeos/exports.sh` derives stable per-install credentials from the
Umbrel seed, rather than storing database credentials in the repository. Keep
the app ID stable so upgrades continue to derive the same credentials.
