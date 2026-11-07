import { AppIcon } from "./AppIcon.web";
import { Button } from "./Button.web";
import type { SignalCardProps } from "./SignalCard.types";
import { moduleTileClasses } from "./tones";

const trendClasses = {
  up: "text-primary-text",
  down: "text-danger",
  flat: "text-ink-muted",
} as const;

export function SignalCard({
  action,
  children,
  detail,
  enterDelayMs = 0,
  eyebrow,
  icon,
  module,
  next,
  onAction,
  title,
  trend = "flat",
  trendText,
  unit,
  value,
}: SignalCardProps) {
  return (
    <section
      aria-label={title}
      className="flex min-w-0 animate-rise flex-col gap-4 rounded-md border border-line bg-surface p-4 shadow-raised motion-reduce:animate-none tablet:p-5 desktop:p-6"
      style={{ animationDelay: `${enterDelayMs}ms` }}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className={`grid size-9 shrink-0 place-items-center rounded-sm ${moduleTileClasses[module]}`}
        >
          <AppIcon name={icon ?? module} />
        </span>
        <h3 className="min-w-0 flex-1 text-title-s text-ink">{title}</h3>
        {eyebrow ? (
          <span className="text-caption text-ink-muted">{eyebrow}</span>
        ) : null}
      </div>
      {value === undefined ? null : (
        <div>
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-figure-xl tabular-nums text-ink">
              {value}
            </span>
            {unit ? (
              <span className="font-mono text-unit text-ink-muted">{unit}</span>
            ) : null}
            {trendText ? (
              <span
                className={`inline-flex items-center gap-1 text-body-s font-semibold tabular-nums ${trendClasses[trend]}`}
              >
                {trend === "flat" ? null : (
                  <AppIcon
                    name={trend === "up" ? "trend-up" : "trend-down"}
                    size={16}
                  />
                )}
                {trendText}
              </span>
            ) : null}
          </div>
        </div>
      )}
      {detail ? (
        <p className="m-0 -mt-2 text-body-s text-ink-muted">{detail}</p>
      ) : null}
      {children}
      {next || action ? (
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-3">
          <span className="min-w-0 text-body-s text-ink">{next}</span>
          {action ? (
            <Button
              className="shrink-0 whitespace-nowrap"
              onPress={onAction}
              variant="tertiary"
            >
              {action}
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
