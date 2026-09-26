import type { ButtonHTMLAttributes } from "react";
import type { ButtonProps } from "./Button.types";

type WebButtonProps = ButtonProps &
  Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "children" | "disabled" | "onClick" | "type"
  >;

const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-lifeos-accent text-lifeos-accent-ink hover:bg-lifeos-accent-dark disabled:bg-stone-300 disabled:text-stone-600",
  secondary:
    "border border-lifeos-border bg-lifeos-surface text-lifeos-primary hover:bg-lifeos-background disabled:bg-stone-200 disabled:text-stone-500 dark:border-white/15 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800 dark:disabled:bg-stone-700 dark:disabled:text-stone-400",
  tertiary:
    "bg-transparent text-lifeos-primary hover:bg-lifeos-background disabled:bg-stone-100 disabled:text-stone-500 dark:text-stone-100 dark:hover:bg-white/10 dark:disabled:bg-stone-800 dark:disabled:text-stone-400",
  danger:
    "bg-red-700 text-white hover:bg-red-800 disabled:bg-stone-300 disabled:text-stone-600",
  icon: "size-11 rounded-lg border border-lifeos-border bg-lifeos-surface p-0 text-lifeos-primary hover:bg-lifeos-background disabled:bg-stone-200 disabled:text-stone-500 dark:border-white/15 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800 dark:disabled:bg-stone-700 dark:disabled:text-stone-400",
};

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
      className={`inline-flex ${variant === "icon" ? "items-center justify-center" : "min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 font-semibold"} transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lifeos-accent-dark disabled:cursor-not-allowed ${variants[variant]} ${className}`.trim()}
      disabled={isDisabled}
      onClick={onPress}
      type={type}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
        />
      ) : null}
      {children}
    </button>
  );
}
