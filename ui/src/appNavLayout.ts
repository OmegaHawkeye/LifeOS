import tokens from "../tokens.json";
import type { AppNavLayout } from "./AppNav.types";

function breakpoint(name: string) {
  const token = tokens.breakpoint.tokens.find((entry) => entry.name === name);
  return Number.parseInt(token?.value ?? "0", 10);
}

const tablet = breakpoint("bp-tablet");
const desktop = breakpoint("bp-desktop");

/** Matches the web tablet: and desktop: breakpoints, for native window widths. */
export function appNavLayout(width: number): AppNavLayout {
  if (width >= desktop) return "sidebar";
  if (width >= tablet) return "rail";
  return "tabbar";
}
