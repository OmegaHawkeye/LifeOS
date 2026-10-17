import type { ButtonHTMLAttributes } from "react";
import type { ButtonProps } from "./Button.types";

type WebButtonProps = ButtonProps &
  Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "children" | "disabled" | "onClick" | "type"
  >;

const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary-hover",
  secondary:
    "border border-line-strong bg-surface text-ink hover:bg-surface-sunken",
  tertiary:
    "bg-transparent text-primary-text hover:bg-primary-soft disabled:bg-transparent",
  danger: "bg-danger text-on-danger",
  icon: "size-target-min border border-line-strong bg-surface p-0 text-ink hover:bg-surface-sunken",
};

const selectedStyles =
  "aria-pressed:border aria-pressed:border-primary aria-pressed:bg-primary-soft aria-pressed:text-primary-text";

export function Button({
  accessibilityLabel,
  children,
  className = "",
  disabled = false,
  loading = false,
  onPress,
  selected,
  type = "button",
  variant = "primary",
  ...props
}: WebButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      {...props}
      aria-label={accessibilityLabel ?? props["aria-label"]}
      aria-busy={loading || undefined}
      aria-pressed={selected}
      className={`inline-flex items-center justify-center rounded-sm ${variant === "icon" ? "" : "min-h-target-min gap-2 px-4 text-label"} transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:border-line disabled:bg-surface-sunken disabled:text-ink-muted ${variants[variant]} ${selectedStyles} ${className}`.trim()}
      disabled={isDisabled}
      onClick={onPress}
      type={type}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-[spin_2.4s_linear_infinite]"
        />
      ) : null}
      {children}
    </button>
  );
}
