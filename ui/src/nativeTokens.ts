import tokens from "../tokens.json";

type ColorToken = { name: string; value: string | Record<string, string> };

/**
 * Resolves a colour token for props that cannot take a className, such as
 * react-native-svg strokes. Follows light and dark only; the wall theme is web-only.
 */
export function tokenColor(name: string, scheme: "light" | "dark") {
  const token = (tokens.color.tokens as ColorToken[]).find(
    (color) => color.name === name,
  );
  if (!token) return undefined;
  return typeof token.value === "string"
    ? token.value
    : (token.value[scheme] ?? token.value.light);
}
