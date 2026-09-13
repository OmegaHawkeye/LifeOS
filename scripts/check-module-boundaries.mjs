import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const sourceRoots = ["backend/app/Modules", "frontend/src/modules"];
const sourceExtensions = new Set([".php", ".ts", ".tsx"]);

export function findBoundaryViolations(files) {
  return files.flatMap(({ path: filePath, contents }) => {
    if (filePath.startsWith("backend/")) {
      return findBackendViolations(filePath, contents);
    }

    if (filePath.startsWith("frontend/")) {
      return findFrontendViolations(filePath, contents);
    }

    return [];
  });
}

function findBackendViolations(filePath, contents) {
  const owner = filePath.match(/^backend\/app\/Modules\/([^/]+)\//)?.[1];

  if (!owner) {
    return [];
  }

  const violations = [];
  const imports = contents.matchAll(/App\\Modules\\([^\\]+)\\([^;\s]+)/g);

  for (const [, target, importedPath] of imports) {
    if (target !== owner && !importedPath.startsWith("Application\\")) {
      violations.push(`${filePath} imports internal code from ${target}`);
    }
  }

  return [...new Set(violations)];
}

function findFrontendViolations(filePath, contents) {
  const owner = filePath.match(/^frontend\/src\/modules\/([^/]+)\//)?.[1];

  if (!owner) {
    return [];
  }

  const violations = [];
  const imports = contents.matchAll(
    /from\s+['"]@\/modules\/([^/'"]+)(\/[^'"]+)?['"]/g,
  );

  for (const [, target, importedPath] of imports) {
    if (target !== owner && importedPath && importedPath !== "/index") {
      violations.push(`${filePath} imports internal code from ${target}`);
    }
  }

  return [...new Set(violations)];
}

function collectSourceFiles(rootDirectory) {
  if (!existsSync(rootDirectory)) {
    return [];
  }

  return readdirSync(rootDirectory, { withFileTypes: true }).flatMap(
    (entry) => {
      const entryPath = path.join(rootDirectory, entry.name);

      if (entry.isDirectory()) {
        return collectSourceFiles(entryPath);
      }

      if (!entry.isFile() || !sourceExtensions.has(path.extname(entry.name))) {
        return [];
      }

      return [
        {
          path: entryPath.split(path.sep).join("/"),
          contents: readFileSync(entryPath, "utf8"),
        },
      ];
    },
  );
}

function run() {
  const files = sourceRoots.flatMap(collectSourceFiles);
  const violations = findBoundaryViolations(files);

  if (violations.length > 0) {
    process.stderr.write(`${violations.join("\n")}\n`);
    process.exitCode = 1;
  }
}

const executedFile = process.argv[1] ? path.resolve(process.argv[1]) : "";

if (executedFile === fileURLToPath(import.meta.url)) {
  run();
}
