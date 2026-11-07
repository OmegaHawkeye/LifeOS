import { AppIcon } from "./AppIcon.web";
import type {
  AppNavLinkProps,
  AppNavProps,
  LogoMarkProps,
} from "./AppNav.types";
import { Button } from "./Button.web";

export { appNavLayout } from "./appNavLayout";

export function LogoMark({ size = 32 }: LogoMarkProps) {
  return (
    <svg
      aria-hidden="true"
      className="shrink-0"
      height={size}
      viewBox="0 0 64 64"
      width={size}
    >
      <rect className="fill-ink" height="64" rx="16" width="64" />
      <path
        className="stroke-primary"
        d="M18 18v28h28"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="7"
      />
      <path
        className="stroke-canvas"
        d="M29 18v17h17"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="7"
      />
    </svg>
  );
}

function DefaultLink({ children, className, current, item }: AppNavLinkProps) {
  return (
    <a
      aria-current={current ? "page" : undefined}
      aria-label={item.label}
      className={className}
      href={item.href ?? `#${item.id}`}
    >
      {children}
    </a>
  );
}

// One landmark that is a bottom tab bar on phones, a rail from tablet: and a sidebar from desktop:.
const navClasses =
  "fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-surface px-2 pb-[max(4px,env(safe-area-inset-bottom))] pt-1 tablet:sticky tablet:inset-x-auto tablet:top-0 tablet:h-svh tablet:w-rail tablet:shrink-0 tablet:flex-col tablet:items-center tablet:gap-6 tablet:border-r tablet:border-t-0 tablet:bg-canvas tablet:px-2 tablet:py-4 desktop:w-sidebar desktop:items-stretch desktop:gap-8 desktop:px-4 desktop:py-6";

const itemClasses =
  "group flex min-h-14 w-full flex-col items-center justify-center gap-0.5 rounded-sm text-caption text-ink-muted no-underline transition-colors duration-150 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus aria-[current=page]:text-primary-text motion-reduce:transition-none tablet:gap-1 tablet:py-2 desktop:min-h-target-min desktop:flex-row desktop:justify-start desktop:gap-3 desktop:px-3 desktop:py-0 desktop:text-label desktop:hover:bg-surface-sunken desktop:aria-[current=page]:bg-primary-soft";

const pipClasses =
  "grid h-7 w-12 place-items-center rounded-full transition-colors duration-150 group-aria-[current=page]:bg-primary-soft motion-reduce:transition-none tablet:h-8 tablet:w-14 desktop:size-auto desktop:group-aria-[current=page]:bg-transparent";

export function AppNav({
  current,
  items,
  label = "Primary navigation",
  onSignOut,
  owner,
  renderLink = DefaultLink,
}: AppNavProps) {
  return (
    <nav aria-label={label} className={navClasses}>
      <div className="hidden items-center gap-3 text-title-s text-ink tablet:flex desktop:px-1">
        <LogoMark />
        <span className="hidden desktop:inline">LifeOS</span>
      </div>
      <ul className="m-0 flex w-full list-none justify-around p-0 tablet:flex-1 tablet:flex-col tablet:justify-start tablet:gap-1 desktop:gap-0.5">
        {items.map((item) => (
          <li
            className={`min-w-0 flex-1 tablet:flex-none ${item.hideOnPhone ? "hidden tablet:block" : ""}`}
            key={item.id}
          >
            {renderLink({
              item,
              current: item.id === current,
              className: itemClasses,
              children: (
                <>
                  <span
                    aria-hidden="true"
                    className={pipClasses}
                    data-testid={`navigation-icon-${item.icon}`}
                  >
                    <AppIcon name={item.icon} size={22} />
                  </span>
                  <span className="max-w-full truncate desktop:hidden">
                    {item.shortLabel ?? item.label}
                  </span>
                  <span className="hidden desktop:inline">{item.label}</span>
                </>
              ),
            })}
          </li>
        ))}
      </ul>
      {owner ? (
        <div className="hidden w-full flex-col items-center gap-2 border-t border-line pt-4 tablet:flex desktop:flex-row desktop:gap-3">
          <span
            aria-hidden="true"
            className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft text-label text-primary-text"
          >
            {owner.charAt(0).toUpperCase()}
          </span>
          <span className="sr-only desktop:not-sr-only desktop:min-w-0 desktop:flex-1 desktop:truncate desktop:text-label desktop:text-ink">
            {owner}
          </span>
          {onSignOut ? (
            <Button
              className="min-h-9 whitespace-nowrap px-2 text-caption desktop:text-label"
              onPress={onSignOut}
              variant="tertiary"
            >
              Sign out
            </Button>
          ) : null}
        </div>
      ) : null}
    </nav>
  );
}
