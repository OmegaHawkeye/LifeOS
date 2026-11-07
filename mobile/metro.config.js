const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");
const { withUniwindConfig } = require("uniwind/metro");

const config = getDefaultConfig(__dirname);

// @lifeos/ui keeps its own node_modules for type checking. Resolve these from the app
// so shared components use the app's single React and React Native instances.
const appSingletons = ["react", "react-native", "react-native-svg"];
const appOrigin = path.join(__dirname, "index.ts");
const resolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const isSingleton = appSingletons.some(
    (name) => moduleName === name || moduleName.startsWith(`${name}/`),
  );
  const resolve = resolveRequest ?? context.resolveRequest;
  return resolve(
    isSingleton ? { ...context, originModulePath: appOrigin } : context,
    moduleName,
    platform,
  );
};

module.exports = withUniwindConfig(config, {
  cssEntryFile: "./global.css",
  dtsFile: "./src/uniwind-types.d.ts",
  extraThemes: ["wall"],
});
