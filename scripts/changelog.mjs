import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const germanMarkdownPath = path.join(repositoryRoot, "CHANGELOG.de.md");
const englishMarkdownPath = path.join(repositoryRoot, "CHANGELOG.en.md");
const versionHeading = /^# (\d+\.\d+\.\d+)$/;
const bulletPattern = /^- .+$/;

export function validateChangelog(markdown) {
  const errors = [];
  const lines = markdown.split(/\r?\n/);
  const sections = [];
  let currentSection = null;

  for (const line of lines) {
    if (line.startsWith("# ")) {
      const match = line.match(versionHeading);
      if (!match) {
        errors.push(`Heading '${line}' must be '# MAJOR.MINOR.PATCH'.`);
        currentSection = null;
        continue;
      }
      currentSection = { version: match[1], bullets: [] };
      sections.push(currentSection);
      continue;
    }

    if (line.startsWith("- ")) {
      if (!currentSection) {
        errors.push("Every changelog bullet must be under a version heading.");
      } else {
        currentSection.bullets.push(line);
        if (!bulletPattern.test(line)) {
          errors.push("Each changelog entry must be a concise bullet point.");
        }
      }
    }
  }

  if (sections.length === 0) {
    errors.push("At least one SemVer version heading is required.");
  }

  for (let index = 0; index < sections.length; index += 1) {
    const section = sections[index];
    if (section.bullets.length === 0 || section.bullets.length > 4) {
      errors.push(
        `# ${section.version} must contain between one and four bullets.`,
      );
    }
    if (
      index > 0 &&
      compareVersions(sections[index - 1].version, section.version) <= 0
    ) {
      errors.push("Version headings must be in descending SemVer order.");
    }
  }

  if (lines.some((line) => /linear\.app|\bOME-\d+\b|unreleased/i.test(line))) {
    errors.push("Do not include Linear references or an Unreleased section.");
  }

  return errors;
}

export function validateChangelogs(german, english) {
  const errors = [
    ...validateChangelog(german).map((error) => `German changelog: ${error}`),
    ...validateChangelog(english).map((error) => `English changelog: ${error}`),
  ];
  const getVersionsAndCounts = (markdown) =>
    markdown.split(/\r?\n/).reduce((sections, line) => {
      const heading = line.match(versionHeading);
      if (heading) {
        sections.push({ version: heading[1], bullets: 0 });
      } else if (line.startsWith("- ") && sections.length > 0) {
        sections.at(-1).bullets += 1;
      }
      return sections;
    }, []);

  if (
    JSON.stringify(getVersionsAndCounts(german)) !==
    JSON.stringify(getVersionsAndCounts(english))
  ) {
    errors.push(
      "German and English changelogs must have matching release versions and bullet counts.",
    );
  }

  return errors;
}

function compareVersions(left, right) {
  const leftParts = left.split(".").map(Number);
  const rightParts = right.split(".").map(Number);
  for (let index = 0; index < 3; index += 1) {
    if (leftParts[index] !== rightParts[index]) {
      return leftParts[index] - rightParts[index];
    }
  }
  return 0;
}

async function run() {
  const [german, english] = await Promise.all([
    readFile(germanMarkdownPath, "utf8"),
    readFile(englishMarkdownPath, "utf8"),
  ]);
  const errors = validateChangelogs(german, english);
  if (errors.length > 0) {
    process.stderr.write(`${errors.join("\n")}\n`);
    process.exitCode = 1;
    return;
  }

  process.stdout.write(
    "German and English changelogs have matching SemVer release entries.\n",
  );
}

const executedFile = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (executedFile === fileURLToPath(import.meta.url)) {
  run().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
