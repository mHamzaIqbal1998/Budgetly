const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Expo's prebuild sets hermesCommand to react-native/sdks/hermesc/%OS-BIN%/hermesc,
 * but React Native 0.83+ does not ship that folder. The hermes-compiler npm package
 * provides the prebuilt hermesc. This plugin patches the app build.gradle to use
 * hermes-compiler instead so EAS/Android release builds succeed.
 */
function withHermesCommandFromCompiler(config) {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const buildGradlePath = path.join(
        config.modRequest.platformProjectRoot,
        "app",
        "build.gradle"
      );
      if (!fs.existsSync(buildGradlePath)) {
        return config;
      }
      let contents = fs.readFileSync(buildGradlePath, "utf8");
      // Expo template points hermesCommand at react-native/sdks/hermesc (not shipped in RN 0.83+).
      // Point it at hermes-compiler package instead (only the hermesCommand line).
      const wrongLine =
        'hermesCommand = new File(["node", "--print", "require.resolve(\'react-native/package.json\')"].execute(null, rootDir).text.trim()).getParentFile().getAbsolutePath() + "/sdks/hermesc/%OS-BIN%/hermesc"';
      const fixedLine =
        'hermesCommand = new File(["node", "--print", "require.resolve(\'hermes-compiler/package.json\')"].execute(null, rootDir).text.trim()).getParentFile().getAbsolutePath() + "/hermesc/%OS-BIN%/hermesc"';
      if (contents.includes(wrongLine)) {
        contents = contents.replace(wrongLine, fixedLine);
        fs.writeFileSync(buildGradlePath, contents);
      }
      return config;
    },
  ]);
}

module.exports = withHermesCommandFromCompiler;
