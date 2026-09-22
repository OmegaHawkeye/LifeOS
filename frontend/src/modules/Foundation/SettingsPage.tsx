import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "./auth-context";
import {
  downloadOwnerDataExport,
  getBackupStatus,
  getOwnerSettings,
  updateOwnerSettings,
} from "./settings";
import { changePassword, deleteOwnerAccount } from "./auth";
import { PasskeySecurityPanel } from "./PasskeySecurityPanel";
import type { BackupStatus, OwnerSettings } from "./settings";

export function SettingsPage() {
  const { owner, updateTheme } = useAuth();
  const [settings, setSettings] = useState<OwnerSettings | null>(null);
  const [backupStatus, setBackupStatus] = useState<BackupStatus | null>(null);
  const [backupStatusError, setBackupStatusError] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [passwords, setPasswords] = useState({
    current: "",
    next: "",
    confirmation: "",
  });
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [emailConfirmation, setEmailConfirmation] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    getOwnerSettings()
      .then((ownerSettings) => {
        setSettings(ownerSettings);
        updateTheme(ownerSettings.theme);
      })
      .catch(() => setLoadError(true));
  }, [updateTheme]);

  useEffect(() => {
    getBackupStatus()
      .then(setBackupStatus)
      .catch(() => setBackupStatusError(true));
  }, []);

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!settings) {
      return;
    }

    setIsSaving(true);
    setSaved(false);
    setSaveError(false);

    try {
      const savedSettings = await updateOwnerSettings(settings);
      setSettings(savedSettings);
      updateTheme(savedSettings.theme);
      setSaved(true);
    } catch {
      setSaved(false);
      setSaveError(true);
    } finally {
      setIsSaving(false);
    }
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsChangingPassword(true);
    setPasswordMessage(null);
    setPasswordError(null);
    try {
      await changePassword(
        passwords.current,
        passwords.next,
        passwords.confirmation,
      );
      setPasswords({ current: "", next: "", confirmation: "" });
      setPasswordMessage("Password changed.");
    } catch (error) {
      setPasswordError(
        error instanceof Error
          ? error.message
          : "Password could not be changed.",
      );
    } finally {
      setIsChangingPassword(false);
    }
  }

  async function exportData() {
    setIsExporting(true);
    setExportError(false);
    try {
      await downloadOwnerDataExport();
    } catch {
      setExportError(true);
    } finally {
      setIsExporting(false);
    }
  }

  async function deleteAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsDeletingAccount(true);
    setDeleteError(null);

    try {
      await deleteOwnerAccount(deletePassword, emailConfirmation);
      window.dispatchEvent(new Event("lifeos:unauthorized"));
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : "LifeOS could not delete this account.",
      );
    } finally {
      setIsDeletingAccount(false);
    }
  }

  if (loadError) {
    return (
      <p role="alert">
        Your settings could not be loaded. Reload the page to try again.
      </p>
    );
  }

  if (!settings) {
    return <p aria-live="polite">Loading settings…</p>;
  }

  return (
    <section aria-labelledby="page-title" className="mx-auto w-full max-w-3xl">
      <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
        LifeOS preferences
      </p>
      <h1
        className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl"
        id="page-title"
      >
        Settings
      </h1>
      <p className="mt-3 text-sm leading-6 text-stone-500 dark:text-stone-400">
        Choose the defaults LifeOS uses across your private workspace.
      </p>

      <form className="mt-8 space-y-5" onSubmit={saveSettings}>
        <div className="grid gap-5 rounded-3xl border border-stone-200 bg-white p-5 dark:border-white/10 dark:bg-stone-900 sm:grid-cols-2 sm:p-7">
          <label className="block text-sm font-medium" htmlFor="timezone">
            Time zone
            <input
              className={fieldClass}
              id="timezone"
              onChange={(event) =>
                setSettings({
                  ...settings,
                  timezone: event.currentTarget.value,
                })
              }
              required
              value={settings.timezone}
            />
          </label>
          <label className="block text-sm font-medium" htmlFor="currency">
            Currency
            <input
              className={fieldClass}
              id="currency"
              maxLength={3}
              minLength={3}
              onChange={(event) =>
                setSettings({
                  ...settings,
                  currency: event.currentTarget.value.toUpperCase(),
                })
              }
              required
              value={settings.currency}
            />
          </label>
          <label
            className="block text-sm font-medium"
            htmlFor="measurement-system"
          >
            Measurement units
            <select
              className={fieldClass}
              id="measurement-system"
              onChange={(event) =>
                setSettings({
                  ...settings,
                  measurement_system: event.currentTarget
                    .value as OwnerSettings["measurement_system"],
                })
              }
              value={settings.measurement_system}
            >
              <option value="metric">Metric (kg, cm)</option>
              <option value="imperial">Imperial (lb, in)</option>
            </select>
          </label>
          <label className="block text-sm font-medium" htmlFor="theme">
            Appearance
            <select
              className={fieldClass}
              id="theme"
              onChange={(event) =>
                setSettings({
                  ...settings,
                  theme: event.currentTarget.value as OwnerSettings["theme"],
                })
              }
              value={settings.theme}
            >
              <option value="system">Use device setting</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
          <label
            className="flex cursor-pointer items-start gap-3 rounded-2xl border border-stone-200 p-4 text-sm dark:border-white/10 sm:col-span-2"
            htmlFor="mask-sensitive-data"
          >
            <input
              checked={settings.mask_sensitive_data_by_default}
              className="mt-0.5 size-4 accent-emerald-500"
              id="mask-sensitive-data"
              onChange={(event) =>
                setSettings({
                  ...settings,
                  mask_sensitive_data_by_default: event.currentTarget.checked,
                })
              }
              type="checkbox"
            />
            <span>
              <span className="block font-medium">
                Hide sensitive values by default
              </span>
              <span className="mt-1 block leading-5 text-stone-500 dark:text-stone-400">
                Keep private amounts and personal details concealed in shared or
                glanceable views.
              </span>
            </span>
          </label>
          <label
            className="flex cursor-pointer items-start gap-3 rounded-2xl border border-stone-200 p-4 text-sm dark:border-white/10 sm:col-span-2"
            htmlFor="notifications-enabled"
          >
            <input
              checked={settings.notifications_enabled}
              className="mt-0.5 size-4 accent-emerald-500"
              id="notifications-enabled"
              onChange={(event) =>
                setSettings({
                  ...settings,
                  notifications_enabled: event.currentTarget.checked,
                })
              }
              type="checkbox"
            />
            <span>
              <span className="block font-medium">Enable in-app reminders</span>
              <span className="mt-1 block leading-5 text-stone-500 dark:text-stone-400">
                Off by default. LifeOS will keep reminders quiet until you opt
                in.
              </span>
            </span>
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <button
            className="rounded-xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-emerald-300 disabled:cursor-wait disabled:opacity-60"
            disabled={isSaving}
            type="submit"
          >
            {isSaving ? "Saving…" : "Save settings"}
          </button>
          {saved && (
            <p
              aria-live="polite"
              className="text-sm text-emerald-700 dark:text-emerald-300"
            >
              Settings saved.
            </p>
          )}
          {saveError && (
            <p
              aria-live="polite"
              className="text-sm text-red-700 dark:text-red-300"
            >
              Settings could not be saved. Check the values and try again.
            </p>
          )}
        </div>
      </form>

      <section className="mt-8 space-y-4 rounded-3xl border border-stone-200 bg-white p-5 dark:border-white/10 dark:bg-stone-900 sm:p-7">
        <div>
          <h2 className="text-lg font-semibold">Your data</h2>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Download your settings and personal records as a portable archive.
            Progress photos are included in their original format.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <button
            className="rounded-xl border border-stone-300 px-5 py-3 text-sm font-semibold transition hover:bg-stone-100 disabled:cursor-wait disabled:opacity-60 dark:border-white/15 dark:hover:bg-white/10"
            disabled={isExporting}
            onClick={() => void exportData()}
            type="button"
          >
            {isExporting ? "Preparing export…" : "Download my data"}
          </button>
          {exportError && (
            <p className="text-sm text-red-700 dark:text-red-300" role="alert">
              Your data export could not be prepared. Please try again.
            </p>
          )}
        </div>
      </section>

      <section className="mt-8 space-y-3 rounded-3xl border border-stone-200 bg-white p-5 dark:border-white/10 dark:bg-stone-900 sm:p-7">
        <div>
          <h2 className="text-lg font-semibold">Backups on your server</h2>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Automatic daily backups · {backupStatus?.retention_days ?? 30} days
            retained by default.
          </p>
        </div>
        {backupStatusError ? (
          <p className="text-sm text-red-700 dark:text-red-300" role="alert">
            Backup status could not be loaded. Check the LifeOS server.
          </p>
        ) : backupStatus?.status === "failed" ? (
          <p className="text-sm text-red-700 dark:text-red-300" role="alert">
            The latest backup failed. Check the LifeOS server before relying on
            your backups.
          </p>
        ) : backupStatus?.status === "never" ? (
          <p
            className="text-sm text-amber-700 dark:text-amber-300"
            role="status"
          >
            No successful backup has been recorded yet.
          </p>
        ) : backupStatus ? (
          <p
            className="text-sm text-emerald-700 dark:text-emerald-300"
            role="status"
          >
            Last successful backup: {backupStatus.last_successful_backup_at}
          </p>
        ) : (
          <p
            className="text-sm text-stone-500 dark:text-stone-400"
            aria-live="polite"
          >
            Loading backup status…
          </p>
        )}
        <p className="text-sm leading-6 text-stone-500 dark:text-stone-400">
          A NAS or second external drive is recommended to protect against
          server-disk failure, but is not required. Backups on this server
          remain enabled without one.
        </p>
      </section>

      <form
        className="mt-8 space-y-5 rounded-3xl border border-stone-200 bg-white p-5 dark:border-white/10 dark:bg-stone-900 sm:p-7"
        onSubmit={savePassword}
      >
        <div>
          <h2 className="text-lg font-semibold">Change password</h2>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Use at least 12 characters.
          </p>
        </div>
        <label className="block text-sm font-medium" htmlFor="current-password">
          Current password
          <input
            className={fieldClass}
            id="current-password"
            required
            type="password"
            autoComplete="current-password"
            value={passwords.current}
            onChange={(event) =>
              setPasswords({ ...passwords, current: event.currentTarget.value })
            }
          />
        </label>
        <label className="block text-sm font-medium" htmlFor="new-password">
          New password
          <input
            className={fieldClass}
            id="new-password"
            required
            minLength={12}
            type="password"
            autoComplete="new-password"
            value={passwords.next}
            onChange={(event) =>
              setPasswords({ ...passwords, next: event.currentTarget.value })
            }
          />
        </label>
        <label className="block text-sm font-medium" htmlFor="confirm-password">
          Confirm new password
          <input
            className={fieldClass}
            id="confirm-password"
            required
            minLength={12}
            type="password"
            autoComplete="new-password"
            value={passwords.confirmation}
            onChange={(event) =>
              setPasswords({
                ...passwords,
                confirmation: event.currentTarget.value,
              })
            }
          />
        </label>
        <div className="flex flex-wrap items-center gap-4">
          <button
            className="rounded-xl border border-stone-300 px-5 py-3 text-sm font-semibold transition hover:bg-stone-100 disabled:cursor-wait disabled:opacity-60 dark:border-white/15 dark:hover:bg-white/10"
            disabled={isChangingPassword}
            type="submit"
          >
            {isChangingPassword ? "Changing…" : "Change password"}
          </button>
          {passwordMessage && (
            <p
              className="text-sm text-emerald-700 dark:text-emerald-300"
              role="status"
            >
              {passwordMessage}
            </p>
          )}
          {passwordError && (
            <p className="text-sm text-red-700 dark:text-red-300" role="alert">
              {passwordError}
            </p>
          )}
        </div>
      </form>

      <PasskeySecurityPanel />

      <section className="mt-8 space-y-4 rounded-3xl border border-red-300 bg-white p-5 dark:border-red-400/30 dark:bg-stone-900 sm:p-7">
        <div>
          <h2 className="text-lg font-semibold text-red-800 dark:text-red-300">
            Danger zone
          </h2>
          <p className="mt-1 text-sm leading-6 text-stone-500 dark:text-stone-400">
            Permanently delete your LifeOS account and all associated records,
            private progress photos, active sessions, and access tokens. This
            cannot be undone. Copies in backups, if any, may remain until those
            backups expire; deletion does not immediately purge backup media.
          </p>
        </div>
        {!showDeleteConfirmation ? (
          <button
            className="rounded-xl border border-red-400 px-5 py-3 text-sm font-semibold text-red-800 transition hover:bg-red-50 dark:border-red-400/40 dark:text-red-300 dark:hover:bg-red-950/30"
            onClick={() => setShowDeleteConfirmation(true)}
            type="button"
          >
            Delete account…
          </button>
        ) : (
          <form className="space-y-4" onSubmit={deleteAccount}>
            <p className="text-sm font-medium text-red-800 dark:text-red-300">
              This permanently deletes your LifeOS account and data.
            </p>
            <label
              className="block text-sm font-medium"
              htmlFor="delete-current-password"
            >
              Password to confirm
              <input
                autoComplete="current-password"
                className={fieldClass}
                id="delete-current-password"
                onChange={(event) =>
                  setDeletePassword(event.currentTarget.value)
                }
                required
                type="password"
                value={deletePassword}
              />
            </label>
            <label
              className="block text-sm font-medium"
              htmlFor="delete-email-confirmation"
            >
              Type your account email to confirm
              <input
                autoComplete="email"
                className={fieldClass}
                id="delete-email-confirmation"
                onChange={(event) =>
                  setEmailConfirmation(event.currentTarget.value)
                }
                required
                type="email"
                value={emailConfirmation}
              />
            </label>
            <div className="flex flex-wrap gap-3">
              <button
                className="rounded-xl bg-red-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-wait disabled:opacity-60"
                disabled={
                  isDeletingAccount ||
                  !owner ||
                  emailConfirmation !== owner.email ||
                  deletePassword.length === 0
                }
                type="submit"
              >
                {isDeletingAccount
                  ? "Deleting account…"
                  : "Permanently delete account"}
              </button>
              <button
                className="rounded-xl border border-stone-300 px-5 py-3 text-sm font-semibold transition hover:bg-stone-100 dark:border-white/15 dark:hover:bg-white/10"
                disabled={isDeletingAccount}
                onClick={() => {
                  setShowDeleteConfirmation(false);
                  setDeletePassword("");
                  setEmailConfirmation("");
                  setDeleteError(null);
                }}
                type="button"
              >
                Cancel
              </button>
            </div>
            {deleteError && (
              <p
                className="text-sm text-red-700 dark:text-red-300"
                role="alert"
              >
                {deleteError}
              </p>
            )}
          </form>
        )}
      </section>
    </section>
  );
}

const fieldClass =
  "mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 dark:border-white/15 dark:bg-stone-950";
