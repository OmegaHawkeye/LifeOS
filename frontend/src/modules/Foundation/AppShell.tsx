import { Link, NavLink, useLocation } from "react-router-dom";
import { AppNav, LogoMark } from "@lifeos/ui/app-nav";
import type { AppNavItem } from "@lifeos/ui/app-nav";
import { Button } from "@lifeos/ui/button";
import type { ReactNode } from "react";
import { useAuth } from "./auth-context";

const navigation: readonly AppNavItem[] = [
  { id: "dashboard", href: "/dashboard", label: "Today", icon: "today" },
  { id: "finance", href: "/finance", label: "Finance", icon: "finance" },
  { id: "fitness", href: "/fitness", label: "Fitness", icon: "fitness" },
  {
    id: "nutrition",
    href: "/nutrition",
    label: "Nutrition",
    shortLabel: "Food",
    icon: "nutrition",
  },
  { id: "health", href: "/health", label: "Health", icon: "health" },
  {
    id: "settings",
    href: "/settings",
    label: "Settings",
    icon: "settings",
    hideOnPhone: true,
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { owner, signOut } = useAuth();
  const { pathname } = useLocation();
  const current =
    navigation.find((item) => item.href && pathname.startsWith(item.href))
      ?.id ?? "dashboard";
  const handleSignOut = () => void signOut().catch(() => undefined);

  return (
    <div className="@container min-h-svh bg-canvas text-ink tablet:flex">
      <AppNav
        current={current}
        items={navigation}
        onSignOut={handleSignOut}
        owner={owner?.name}
        renderLink={({ children, className, item }) => (
          <NavLink
            aria-label={item.label}
            className={className}
            end
            to={item.href ?? "/dashboard"}
          >
            {children}
          </NavLink>
        )}
      />

      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between gap-3 border-b border-line bg-surface px-4 py-2 tablet:hidden">
          <Link
            aria-label="LifeOS home"
            className="flex min-h-target-min items-center gap-3 text-title-s text-ink no-underline"
            to="/dashboard"
          >
            <LogoMark size={28} />
            LifeOS
          </Link>
          <div className="flex items-center gap-1">
            <Link
              aria-label={`Settings for ${owner?.name ?? "your account"}`}
              className="grid size-target-min place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              to="/settings"
            >
              <span
                aria-hidden="true"
                className="grid size-8 place-items-center rounded-full bg-primary-soft text-label text-primary-text"
              >
                {owner?.name.charAt(0).toUpperCase()}
              </span>
            </Link>
            <Button onPress={handleSignOut} variant="tertiary">
              Sign out
            </Button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-content px-4 pb-28 pt-6 tablet:px-6 tablet:pb-12 tablet:pt-8 desktop:px-8 desktop:pt-10">
          {children}
        </main>
      </div>
    </div>
  );
}
