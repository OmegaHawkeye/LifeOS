import type { ButtonHTMLAttributes } from "react";
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
  onCheckedChange,
  size = "md",
  ...props
}: WebSwitchProps) {
  return (
    <button
      {...props}
      aria-checked={checked}
      aria-label={accessibilityLabel}
      className={cn(
        switchTrackVariants({
          checked,
          className,
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
}
