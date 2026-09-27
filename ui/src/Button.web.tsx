import type { ButtonHTMLAttributes } from "react";
import type { ButtonProps } from "./Button.types";
import { buttonVariants } from "./buttonVariants";
import { cn } from "./cn";

type WebButtonProps = ButtonProps &
  Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "children" | "disabled" | "onClick" | "type"
  >;

export function Button({
  accessibilityLabel,
  children,
  className = "",
  disabled = false,
  loading = false,
  onPress,
  selected,
  size,
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
      className={cn(
        buttonVariants({
          className,
          disabled: isDisabled,
          size: size ?? (variant === "icon" ? "icon" : "md"),
          variant,
        }),
      )}
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
