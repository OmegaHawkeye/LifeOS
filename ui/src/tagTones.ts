import type { TagTone } from "./Tag.types";
import { moduleTileClasses } from "./tones";

export const tagToneClasses: Record<TagTone, string> = {
  ...moduleTileClasses,
  neutral: "bg-surface-sunken text-ink-muted",
  positive: "bg-primary-soft text-primary-text",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  now: "bg-marigold text-on-marigold",
};
