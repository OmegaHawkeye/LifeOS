import type { ButtonHTMLAttributes } from "react";
import type { SwitchProps } from "./Switch.types";
import { switchThumbVariants, switchTrackVariants } from "./switchVariants";

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
      className={switchTrackVariants({
        checked,
        className,
        disabled,
        size,
      })}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      role="switch"
      type="button"
    >
      <span className={switchThumbVariants({ checked, size })} />
    </button>
  );
}
