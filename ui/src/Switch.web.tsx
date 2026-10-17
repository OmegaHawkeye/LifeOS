import { useId } from "react";
import type { SwitchProps } from "./Switch.types";

// Stacked rows are separated by block padding and a hairline ([&+&] targets the next sibling row).
export function Switch({
  checked,
  disabled,
  hint,
  label,
  onChange,
}: SwitchProps) {
  const id = useId();

  return (
    <label
      className="flex min-h-target-min cursor-pointer items-center justify-between gap-4 py-3 has-disabled:cursor-not-allowed [&+&]:border-t [&+&]:border-line"
      htmlFor={id}
    >
      <span className="flex flex-col">
        <span className="text-body text-ink">{label}</span>
        {hint ? (
          <span className="text-body-s text-ink-muted">{hint}</span>
        ) : null}
      </span>
      <input
        checked={checked}
        className="peer sr-only"
        disabled={disabled}
        id={id}
        onChange={(event) => onChange(event.target.checked)}
        role="switch"
        type="checkbox"
      />
      <span
        aria-hidden="true"
        className="relative h-7 w-12 shrink-0 rounded-full border border-line-strong bg-surface-sunken transition-colors duration-150 peer-checked:border-primary peer-checked:bg-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus peer-disabled:border-line motion-reduce:transition-none peer-checked:[&>span]:translate-x-5 peer-checked:[&>span]:bg-on-primary"
      >
        <span className="absolute top-[3px] left-[3px] size-5 rounded-full bg-ink-muted transition-transform duration-150 motion-reduce:transition-none" />
      </span>
    </label>
  );
}
