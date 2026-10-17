import type { TagProps } from "./Tag.types";
import { tagToneClasses } from "./tagTones";

export function Tag({ children, tone = "neutral" }: TagProps) {
  return (
    <span
      className={`inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-xs px-2 text-caption font-semibold ${tagToneClasses[tone]}`}
    >
      {children}
    </span>
  );
}
