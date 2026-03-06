const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Allow importing from ../shared (monorepo)
config.watchFolders = [require("path").resolve(__dirname, "../shared")];
config.resolver.nodeModulesPaths = [
  require("path").resolve(__dirname, "node_modules"),
];

module.exports = withNativeWind(config, { input: "./src/globals.css" });
