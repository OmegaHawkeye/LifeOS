import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appConfig = JSON.parse(
  await readFile(new URL("../mobile/app.json", import.meta.url), "utf8"),
);
const healthKitModule = JSON.parse(
  await readFile(
    new URL(
      "../mobile/modules/lifeos-healthkit/expo-module.config.json",
      import.meta.url,
    ),
    "utf8",
  ),
);

test("iOS enables Expo scene lifecycle support for current iOS SDKs", () => {
  assert.ok(
    appConfig.expo.plugins.some(
      (plugin) =>
        Array.isArray(plugin) &&
        plugin[0] === "expo-build-properties" &&
        plugin[1]?.ios?.enableSceneSupport === true,
    ),
  );
});

test("HealthKit is enabled as an iOS read-only capability", () => {
  assert.equal(
    appConfig.expo.ios.entitlements["com.apple.developer.healthkit"],
    true,
  );
  assert.equal(
    typeof appConfig.expo.ios.infoPlist.NSHealthShareUsageDescription,
    "string",
  );
  assert.equal(
    typeof appConfig.expo.ios.infoPlist.NSLocalNetworkUsageDescription,
    "string",
  );
  assert.equal(
    appConfig.expo.ios.infoPlist.NSAppTransportSecurity.NSAllowsLocalNetworking,
    true,
  );
  assert.equal(
    Object.hasOwn(
      appConfig.expo.ios.infoPlist,
      "NSHealthUpdateUsageDescription",
    ),
    false,
  );
  assert.deepEqual(healthKitModule.platforms, ["apple"]);
});
