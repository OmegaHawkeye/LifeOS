import { Link, NavLink } from "react-router-dom";
import { AppIcon } from "@lifeos/ui/icons";
import type { ReactNode } from "react";
import { useAuth } from "./auth-context";

const navigation = [
  { to: "/dashboard", label: "Dashboard", shortLabel: "Today", icon: "today" },
  { to: "/finance", label: "Finance", shortLabel: "Finance", icon: "finance" },
  { to: "/fitness", label: "Fitness", shortLabel: "Fitness", icon: "fitness" },
  {
    to: "/nutrition",
    label: "Nutrition",
    shortLabel: "Nutrition",
    icon: "nutrition",
  },
  { to: "/health", label: "Health", shortLabel: "Health", icon: "health" },
  {
    to: "/settings",
    label: "Settings",
    shortLabel: "Settings",
    icon: "settings",
  },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { owner, signOut } = useAuth();

  return (
    <div className="min-h-svh bg-stone-100 text-stone-950 dark:bg-stone-950 dark:text-stone-100">
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/90 px-4 backdrop-blur dark:border-white/10 dark:bg-stone-950/90 sm:px-6">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-4">
          <Link
            aria-label="LifeOS home"
            className="flex shrink-0 items-center gap-3"
            to="/dashboard"
          >
            <span
              aria-hidden="true"
              className="grid size-9 place-items-center rounded-xl bg-emerald-400 text-sm font-bold text-stone-950"
            >
              L
            </span>
            <span className="text-base font-semibold tracking-tight">
              LifeOS
            </span>
          </Link>
          <div className="flex min-w-0 items-center gap-3">
            <span className="hidden max-w-40 truncate text-sm text-stone-500 dark:text-stone-400 sm:block">
              {owner?.name}
            </span>
            <button
              className="rounded-lg px-3 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-white/10"
              onClick={() => void signOut().catch(() => undefined)}
              type="button"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px] md:min-h-[calc(100svh-4rem)]">
        <nav
          aria-label="Primary navigation"
          className="fixed inset-x-0 bottom-0 z-30 flex gap-1 overflow-x-auto border-t border-stone-200 bg-white px-2 pb-[env(safe-area-inset-bottom)] pt-2 dark:border-white/10 dark:bg-stone-950 md:sticky md:top-16 md:h-[calc(100svh-4rem)] md:w-56 md:shrink-0 md:flex-col md:gap-1 md:overflow-y-auto md:border-r md:border-t-0 md:bg-transparent md:px-4 md:py-8 md:pt-8 dark:md:bg-transparent"
        >
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              aria-label={item.label}
              className={({ isActive }) =>
                `flex min-w-[68px] flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-medium transition md:min-w-0 md:flex-initial md:grow-0 md:flex-row md:gap-3 md:px-3 md:py-3 md:text-sm ${isActive ? "bg-emerald-400/15 text-emerald-800 dark:text-emerald-200" : "text-stone-500 hover:bg-stone-200/70 dark:text-stone-400 dark:hover:bg-white/5"}`
              }
              end
              to={item.to}
            >
              <span
                aria-hidden="true"
                className="grid size-6 place-items-center md:size-7"
                data-testid={`navigation-icon-${item.icon}`}
              >
                <AppIcon name={item.icon} size={20} />
              </span>
              <span className="whitespace-nowrap">{item.shortLabel}</span>
            </NavLink>
          ))}
        </nav>
        <main className="min-w-0 flex-1 px-5 pb-28 pt-8 sm:px-8 md:px-10 md:pb-12 md:pt-10 md:pr-14 2xl:pr-20">
          {children}
        </main>
      </div>
    </div>
  );
}
