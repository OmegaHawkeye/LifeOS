// Generates the Tailwind v4 theme files from ui/tokens.json, the LifeOS design-system tokens.
// Run with `pnpm --dir ui theme:generate`; never edit the generated CSS by hand.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tokens = JSON.parse(readFileSync(join(root, "tokens.json"), "utf8"));
const header = (purpose) =>
  `/* Generated from ui/tokens.json by ui/scripts/generate-theme.mjs. Do not edit. ${purpose} */\n`;

const themes = tokens.color.themes.map((theme) => theme.id);
const colors = tokens.color.tokens;

function colorValue(token, theme) {
  const value =
    typeof token.value === "string"
      ? token.value
      : (token.value[theme] ?? token.value[themes[0]]);
  if (value.startsWith("{")) {
    const target = colors.find((color) => color.name === value.slice(1, -1));
    return colorValue(target, theme);
  }
  return value;
}

function themedVariables(theme) {
  const lines = colors.map(
    (token) => `--color-${token.name}: ${colorValue(token, theme)};`,
  );
  for (const shadow of tokens.shadow.tokens) {
    const value =
      typeof shadow.value === "string"
        ? shadow.value
        : (shadow.value[theme] ?? shadow.value[themes[0]]);
    lines.push(`--${shadow.name}: ${value};`);
  }
  return lines;
}

const indent = (lines, depth) =>
  lines.map((line) => `${"  ".repeat(depth)}${line}`).join("\n");

function sharedTheme() {
  const lines = [];
  lines.push(
    "/* Colour: bg-canvas, text-ink, border-line-strong, bg-primary text-on-primary, bg-finance-soft … */",
  );
  lines.push(...themedVariables(themes[0]));
  lines.push("", "/* Type families: font-display, font-sans, font-mono */");
  for (const [key, stack] of Object.entries(tokens.type.families)) {
    lines.push(`--font-${key}: ${stack};`);
  }
  lines.push(
    "",
    "/* Text styles: text-display-l, text-body, text-label, text-figure-xl … */",
  );
  for (const group of tokens.type.groups) {
    for (const style of group.styles) {
      lines.push(`--text-${style.name}: ${style.fontSize};`);
      lines.push(`--text-${style.name}--line-height: ${style.lineHeight};`);
      lines.push(`--text-${style.name}--font-weight: ${style.fontWeight};`);
      if (style.letterSpacing) {
        lines.push(
          `--text-${style.name}--letter-spacing: ${style.letterSpacing};`,
        );
      }
    }
  }
  lines.push(
    "",
    "/* Spacing: the 4px step equals space-N (p-4 = 16px). Named sizes: min-h-target-min, w-sidebar … */",
  );
  lines.push("--spacing: 4px;");
  for (const size of tokens.size.tokens) {
    if (size.name === "content-max" || size.name === "measure") continue;
    lines.push(
      `--spacing-${size.name.replace(/-(width|height)$/, "")}: ${size.value};`,
    );
  }
  lines.push("--container-content: 1200px;", "--container-measure: 68ch;");
  lines.push(
    "",
    "/* Radius: rounded-xs, rounded-sm, rounded-md, rounded-lg */",
  );
  for (const radius of tokens.radius.tokens) {
    if (radius.name !== "radius-full")
      lines.push(`--${radius.name}: ${radius.value};`);
  }
  lines.push("", "/* Breakpoints: tablet:, desktop:, wide: */");
  for (const breakpoint of tokens.breakpoint.tokens) {
    lines.push(
      `--breakpoint-${breakpoint.name.replace("bp-", "")}: ${breakpoint.value};`,
    );
  }
  lines.push(
    "",
    "/* Motion: ease-lifeos, animate-grow, animate-draw, animate-rise, animate-pop, animate-tick */",
    "--ease-lifeos: cubic-bezier(0.3, 0.7, 0.2, 1);",
    "--ease-lifeos-pop: cubic-bezier(0.3, 1.4, 0.5, 1);",
    "--animate-grow: lo-grow 0.6s var(--ease-lifeos) 0.15s both;",
    "--animate-draw: lo-draw 0.8s var(--ease-lifeos) 0.1s both;",
    "--animate-rise: lo-rise 0.4s var(--ease-lifeos) both;",
    "--animate-pop: lo-pop 0.25s var(--ease-lifeos-pop) 0.85s both;",
    "--animate-tick: lo-tick 0.18s var(--ease-lifeos-pop);",
    "",
    "@keyframes lo-grow { from { transform: scaleX(0); } }",
    "@keyframes lo-draw { from { stroke-dashoffset: 1; } }",
    "@keyframes lo-rise { from { opacity: 0; transform: translateY(8px); } }",
    "@keyframes lo-pop { from { transform: scale(0); } }",
    "@keyframes lo-tick { from { transform: scale(0.6); opacity: 0; } }",
  );
  return `${header("Shared tokens; light values are the defaults.")}\n@theme {\n${indent(lines, 1)}\n}\n`;
}

function themeBlocks(themeIds) {
  return themeIds
    .map(
      (theme) =>
        `    @variant ${theme} {\n${indent(themedVariables(theme), 3)}\n    }`,
    )
    .join("\n");
}

const web = `${header('Web: `.dark` on the root for Dark, data-theme="wall" for the wall display.')}
@custom-variant wall (&:where([data-theme="wall"], [data-theme="wall"] *));

@layer theme {
  :root {
${themeBlocks(themes.slice(1))}
  }
}
`;

// React Native takes one family name, not a CSS stack, and has no inherited font.
// So native names the embedded families (see mobile/app.json) and each text style carries its own.
function nativeType() {
  const families = tokens.type.nativeFamilies;
  const variables = Object.entries(families).map(
    ([key, family]) => `  --font-${key}: "${family}";`,
  );
  const utilities = tokens.type.groups.flatMap((group) =>
    group.styles.map(
      (style) =>
        `@utility text-${style.name} {\n  font-family: "${families[style.family ?? group.family]}";\n}`,
    ),
  );
  return `@theme {\n${variables.join("\n")}\n}\n\n${utilities.join("\n")}\n`;
}

// Uniwind needs every theme, light included, to declare the same variables; register `wall` as an extra theme in metro.config.js.
const native = `${header("Native (Uniwind): light, dark and wall themes, and embedded font families.")}
@layer theme {
  :root {
${themeBlocks(themes)}
  }
}

${nativeType()}`;

writeFileSync(join(root, "theme.css"), sharedTheme());
writeFileSync(join(root, "theme.web.css"), web);
writeFileSync(join(root, "theme.native.css"), native);
console.log("Wrote theme.css, theme.web.css and theme.native.css");
