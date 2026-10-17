import { useLayoutEffect, useRef, useState } from "react";
import type { SegmentedControlProps } from "./SegmentedControl.types";

type Thumb = { x: number; width: number };

export function SegmentedControl({
  block = false,
  label,
  onChange,
  options,
  value,
}: SegmentedControlProps) {
  const group = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<Thumb | null>(null);

  // One thumb slides to the selected option, measured after layout and on resize.
  useLayoutEffect(() => {
    const element = group.current;
    if (!element) return;
    const measure = () => {
      const selected = element.querySelector<HTMLElement>(
        '[aria-checked="true"]',
      );
      if (selected) {
        setThumb({ x: selected.offsetLeft, width: selected.offsetWidth });
      }
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [value, options.length]);

  return (
    <div
      aria-label={label}
      className={`relative gap-0.5 rounded-[11px] bg-surface-sunken p-[3px] ${block ? "flex" : "inline-flex"}`}
      ref={group}
      role="radiogroup"
    >
      {thumb ? (
        <span
          aria-hidden="true"
          className="absolute inset-y-[3px] left-0 rounded-sm bg-surface shadow-raised ring-1 ring-line-strong transition-[transform,width] duration-[220ms] ease-lifeos motion-reduce:transition-none"
          style={{ transform: `translateX(${thumb.x}px)`, width: thumb.width }}
        />
      ) : null}
      {options.map((option) => (
        <button
          aria-checked={option.value === value}
          className={`relative z-10 min-h-[38px] rounded-sm px-4 text-label text-ink-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus aria-checked:text-ink ${block ? "flex-1" : ""}`}
          key={option.value}
          onClick={() => onChange(option.value)}
          role="radio"
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
