import { copyFileSync, existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import process from "node:process";

const root = new URL("..", import.meta.url);

function copyExample(relativePath) {
  const destination = new URL(relativePath, root);

  if (!existsSync(destination)) {
    copyFileSync(new URL(`${relativePath}.example`, root), destination);
  }
}

function run(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, stdio: "inherit" });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

copyExample(".env");
copyExample("backend/.env");
copyExample("frontend/.env");

run("composer", ["install", "--working-dir=backend"]);
run("pnpm", ["install"], new URL("../frontend", import.meta.url));
run(
  "pnpm",
  ["exec", "playwright", "install", "chromium"],
  new URL("../frontend", import.meta.url),
);
run("docker", ["compose", "up", "-d", "--wait", "postgres"]);

if (
  /^APP_KEY=\s*$/m.test(
    readFileSync(new URL("../backend/.env", import.meta.url), "utf8"),
  )
) {
  run(
    "php",
    ["artisan", "key:generate", "--no-interaction"],
    new URL("../backend", import.meta.url),
  );
}

run(
  "php",
  ["artisan", "migrate", "--no-interaction"],
  new URL("../backend", import.meta.url),
);
run("pnpm", ["contract:generate"]);
