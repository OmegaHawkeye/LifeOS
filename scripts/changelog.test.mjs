import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateChangelog, validateChangelogs } from "./changelog.mjs";

const [german, english] = await Promise.all([
  readFile(new URL("../CHANGELOG.de.md", import.meta.url), "utf8"),
  readFile(new URL("../CHANGELOG.en.md", import.meta.url), "utf8"),
]);

test("accepts separate concise German and English SemVer changelogs", () => {
  assert.deepEqual(validateChangelogs(german, english), []);
});

test("rejects Unreleased and Linear references", () => {
  const errors = validateChangelog(
    "# 0.2.0\n- DE: Änderung. / EN: Change.\n\n# Unreleased\n",
  );

  assert.ok(errors.some((error) => error.includes("MAJOR.MINOR.PATCH")));
  assert.ok(errors.some((error) => error.includes("Unreleased")));
});

test("requires at most four bullets per version", () => {
  const errors = validateChangelog(
    [
      "# 0.2.0",
      "- DE: Eins. / EN: One.",
      "- DE: Zwei. / EN: Two.",
      "- DE: Drei. / EN: Three.",
      "- DE: Vier. / EN: Four.",
      "- Fünf.",
      "",
    ].join("\n"),
  );

  assert.ok(errors.some((error) => error.includes("between one and four")));
});

test("requires matching versions and entry counts across both languages", () => {
  assert.ok(
    validateChangelogs(
      "# 0.2.0\n- Deutsch.\n",
      "# 0.2.0\n- English.\n- Another entry.\n",
    ).includes(
      "German and English changelogs must have matching release versions and bullet counts.",
    ),
  );
});

test("requires version headings in descending order", () => {
  const errors = validateChangelog(
    "# 0.1.0\n- DE: Alt. / EN: Old.\n\n# 0.2.0\n- DE: Neu. / EN: New.\n",
  );

  assert.ok(
    errors.includes("Version headings must be in descending SemVer order."),
  );
});
