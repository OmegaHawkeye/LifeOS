import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "./auth-context";
import { getOwnerSettings, updateOwnerSettings } from "./settings";
import type { OwnerSettings } from "./settings";

export function SettingsPage() {
  const { updateTheme } = useAuth();
  const [settings, setSettings] = useState<OwnerSettings | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    getOwnerSettings()
      .then((ownerSettings) => {
        setSettings(ownerSettings);
        updateTheme(ownerSettings.theme);
      })
      .catch(() => setLoadError(true));
  }, [updateTheme]);

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
    </section>
  );
}

const fieldClass =
  "mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 dark:border-white/15 dark:bg-stone-950";
