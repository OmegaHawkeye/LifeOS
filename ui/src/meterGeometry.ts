import type { MeterProps, MeterTone } from "./Meter.types";
import { moduleFillClasses } from "./tones";

export const meterFillClasses: Record<MeterTone, string> = {
  ...moduleFillClasses,
  warning: "bg-warning",
  danger: "bg-danger",
};

export const meterNoteClasses: Record<MeterTone, string> = {
  finance: "text-ink-muted",
  fitness: "text-ink-muted",
  nutrition: "text-ink-muted",
  health: "text-ink-muted",
  routines: "text-ink-muted",
  warning: "text-warning",
  danger: "text-danger",
};

const clampPercent = (value: number, max: number) =>
  Math.max(0, Math.min(100, (value / max) * 100));

export function meterGeometry({ value, max = 100, target }: MeterProps) {
  return {
    fill: clampPercent(value, max),
    target: target === undefined ? undefined : clampPercent(target, max),
  };
}
