import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import os from "node:os";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFile(path.join(root, file), "utf8");

test("LifeOS community store app id matches its store prefix", async () => {
  const store = await read("umbrel-app-store.yml");
  const manifest = await read("lifeos-lifeos/umbrel-app.yml");

  assert.match(store, /^id:\s*["']?lifeos["']?\s*$/m);
  assert.match(manifest, /^id:\s*["']?lifeos-lifeos["']?\s*$/m);
});

test("Umbrel manifest advertises the supported version and app port", async () => {
  const manifest = await read("lifeos-lifeos/umbrel-app.yml");

  assert.match(manifest, /^manifestVersion:\s*1\.1\s*$/m);
  assert.match(manifest, /^version:\s*["']?0\.15\.2["']?\s*$/m);
  assert.match(manifest, /^port:\s*8890\s*$/m);
  assert.match(manifest, /^storage:\n\s+dataRoot:\s+data\s*$/m);
});

test("LifeOS release workflow builds both supported Umbrel architectures", async () => {
  const workflow = await read(".github/workflows/publish-container.yml");

  assert.match(workflow, /platforms:\s*linux\/amd64,linux\/arm64/);
});

test("CI runs the Umbrel persistent storage permission smoke test", async () => {
  const workflow = await read(".github/workflows/ci.yml");

  assert.match(
    workflow,
    /bash scripts\/umbrel-storage-smoke\.sh 0\.0\.0-smoke-candidate/,
  );
  assert.match(workflow, /bash scripts\/umbrel-database-auth-smoke\.sh/);
});

test("Umbrel compose routes through app_proxy without publishing service ports", async () => {
  const compose = await read("lifeos-lifeos/docker-compose.yml");

  assert.match(
    compose,
    /app_proxy:\n\s+environment:\n\s+APP_HOST:\s+lifeos-lifeos_lifeos_1\n\s+APP_PORT:\s+8080\n\s+PROXY_AUTH_ADD:\s+["']false["']/,
  );
  assert.doesNotMatch(compose, /^\s+ports:/m);
  assert.match(
    compose,
    /APP_URL:\s+["']http:\/\/\$\{DEVICE_DOMAIN_NAME\}:8890["']/,
  );
  assert.match(compose, /image:\s+ghcr\.io\/omegahawkeye\/lifeos:0\.15\.2/);
  assert.match(compose, /DB_HOST:\s+postgres/);
});

test("Umbrel runtime initializes writable storage before starting LifeOS as uid 1000", async () => {
  const compose = await read("lifeos-lifeos/docker-compose.yml");
  const initializer = await read("docker/prepare-umbrel-storage.sh");

  assert.match(
    compose,
    /storage-init:\n(?:.|\n)*?user:\s*["']?0:0["']?\n(?:.|\n)*?lifeos-prepare-umbrel-storage/,
  );
  assert.match(
    compose,
    /lifeos:\n(?:.|\n)*?storage-init:\n\s+condition:\s+service_completed_successfully/,
  );
  assert.match(compose, /LOG_CHANNEL:\s*stderr/);
  assert.match(compose, /XDG_CONFIG_HOME:\s*\/tmp\/lifeos-caddy\/config/);
  assert.match(compose, /XDG_DATA_HOME:\s*\/tmp\/lifeos-caddy\/data/);
  assert.match(initializer, /chown -R 1000:1000 "\$storage_root"/);
  assert.match(initializer, /\$storage_root\/logs/);
  assert.match(initializer, /\$storage_root\/framework\/views/);
  assert.match(initializer, /\/backups/);
});

test("runtime and database data are persisted under the app data directory", async () => {
  const compose = await read("lifeos-lifeos/docker-compose.yml");

  assert.match(compose, /\$\{APP_DATA_DIR\}\/data\/postgres:/);
  assert.match(compose, /\$\{APP_DATA_DIR\}\/data\/storage:/);
  assert.match(compose, /\$\{APP_DATA_DIR\}\/data\/backups:/);
  assert.match(compose, /LIFEOS_BACKUP_RETENTION_DAYS:\s*["']?30/);
});

test("Umbrel repairs a stale Postgres password without replacing the database", async () => {
  const compose = await read("lifeos-lifeos/docker-compose.yml");

  assert.match(compose, /postgres:\n(?:.|\n)*?POSTGRES_PASSWORD:/);
  assert.match(compose, /PGPASSWORD=.*POSTGRES_PASSWORD/);
  assert.match(compose, /\\password/);
  assert.match(compose, /hostname -i/);
  assert.match(compose, /POSTGRES_DB/);
  assert.match(compose, /POSTGRES_USER/);
  assert.match(compose, /--command='SELECT 1'/);
});

test("Umbrel secrets are derived per app installation and never hard-coded", async () => {
  const exports = await read("lifeos-lifeos/exports.sh");
  const compose = await read("lifeos-lifeos/docker-compose.yml");

  assert.match(exports, /app-lifeos-lifeos-seed-APP_KEY/);
  assert.match(exports, /app-lifeos-lifeos-seed-DB_PASSWORD/);
  assert.match(exports, /derive_secret\(\)/);
  assert.match(compose, /APP_KEY:\s+["']base64:\$\{APP_LIFEOS_APP_KEY/);
  assert.match(compose, /DB_PASSWORD:\s+\$\{APP_LIFEOS_DB_PASSWORD/);
  assert.doesNotMatch(
    compose,
    /(?:password|secret):\s*["']?(?:lifeos|password|secret)/i,
  );
});

test("Umbrel exports derive stable, distinct Laravel and database secrets", async () => {
  const temporaryDirectory = await mkdtemp(
    path.join(os.tmpdir(), "lifeos-umbrel-secrets-"),
  );
  const appDataDirectory = path.join(temporaryDirectory, "app-data");
  const appDirectory = path.join(appDataDirectory, "lifeos-lifeos");
  const seedDirectory = path.join(appDataDirectory, "db", "umbrel-seed");
  const scriptPath = path.join(appDirectory, "exports.sh");

  try {
    await mkdir(appDirectory, { recursive: true });
    await mkdir(seedDirectory, { recursive: true });
    await writeFile(scriptPath, await read("lifeos-lifeos/exports.sh"));
    await writeFile(path.join(seedDirectory, "seed"), "test-only-umbrel-seed");

    const exportSecrets = () =>
      execFileSync(
        "bash",
        [
          "-c",
          'source "$1"; printf "%s\\n%s\\n" "$APP_LIFEOS_APP_KEY" "$APP_LIFEOS_DB_PASSWORD"',
          "_",
          scriptPath,
        ],
        { encoding: "utf8" },
      ).trimEnd();
    const first = exportSecrets();
    const second = exportSecrets();
    const [appKey, databasePassword] = first.split("\n");

    assert.equal(first, second);
    assert.equal(Buffer.from(appKey, "base64").byteLength, 32);
    assert.equal(Buffer.from(databasePassword, "base64").byteLength, 32);
    assert.notEqual(appKey, databasePassword);
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});

test("Umbrel docs describe UI install, update, backups, and uninstall data loss", async () => {
  const docs = await read("docs/umbrel.md");

  assert.match(docs, /community app store/i);
  assert.match(
    docs,
    /Umbrel.*App Store.*(search|install)|install.*from.*App Store/is,
  );
  assert.match(docs, /daily backups/i);
  assert.match(docs, /30 days/);
  assert.match(docs, /uninstall.*(delete|remove)|delete.*data/is);
  assert.match(docs, /update/i);
  assert.match(docs, /correlation ID/i);
  assert.match(docs, /container logs/i);
});
