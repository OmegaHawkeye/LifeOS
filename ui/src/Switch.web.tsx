import { useId, type ButtonHTMLAttributes } from "react";
import type { SwitchProps } from "./Switch.types";
import { switchThumbVariants, switchTrackVariants } from "./switchVariants";
import { cn } from "./cn";

type WebSwitchProps = SwitchProps &
  Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "children" | "disabled" | "onChange" | "onClick" | "size" | "type"
  >;

export function Switch({
  accessibilityLabel,
  checked,
  className = "",
  disabled = false,
  hint,
  label,
  onCheckedChange,
  size = "md",
  ...props
}: WebSwitchProps) {
  const id = useId();
  const labelId = `${id}-label`;
  const hintId = `${id}-hint`;

  const control = (
    <button
      {...props}
      aria-checked={checked}
      aria-describedby={hint ? hintId : undefined}
      aria-label={label ? undefined : accessibilityLabel}
      aria-labelledby={label ? labelId : undefined}
      className={cn(
        switchTrackVariants({
          checked,
          className: label ? undefined : className,
          disabled,
          size,
        }),
      )}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      role="switch"
      type="button"
    >
      <span className={cn(switchThumbVariants({ checked, size }))} />
    </button>
  );

  if (!label) return control;

  // Stacked rows are separated by block padding and a hairline ([&+&] targets the next sibling row).
  return (
    <div
      className={cn(
        "flex min-h-target-min items-center justify-between gap-4 py-3 [&+&]:border-t [&+&]:border-line",
        className,
      )}
    >
      <span className="flex flex-col">
        <span className="text-body text-ink" id={labelId}>
          {label}
        </span>
        {hint ? (
          <span className="text-body-s text-ink-muted" id={hintId}>
            {hint}
          </span>
        ) : null}
      </span>
      {control}
    </div>
  );
}
