import type { AppIconProps } from "./AppIcon.types";
import { iconPaths } from "./iconPaths";

export function AppIcon({ name, size = 20, testID }: AppIconProps) {
  return (
    <svg
      aria-hidden="true"
      className="shrink-0"
      data-testid={testID}
      fill="none"
      focusable="false"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      width={size}
    >
      {iconPaths[name].map((path, index) => (
        <path d={path} key={`${name}-${index}`} />
      ))}
    </svg>
  );
}
