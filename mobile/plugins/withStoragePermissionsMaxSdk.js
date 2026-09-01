const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Local config plugin — resolves the "Expo Max Sdk Override" manifest merge warning.
 *
 * Expo's base Android manifest template (in `@expo/config-plugins`) injects
 * `READ/WRITE_EXTERNAL_STORAGE` WITH `android:maxSdkVersion="32"` and `tools:replace`.
 * Third-party native libraries (notably `react-native-blob-util`, pulled in transitively
 * by `react-native-pdf`) declare the SAME permissions WITHOUT `android:maxSdkVersion`.
 *
 * During the manifest merge, Expo's `FixManifestMaxSdkTask` detects a permission defined
 * in one place WITH `maxSdkVersion` and in another WITHOUT, then emits a noisy (although
 * self-healing) "Expo Max Sdk Override Plugin" warning and strips `maxSdkVersion` from the
 * final merged manifest.
 *
 * To silence the warning at the source and produce the identical final merged manifest,
 * this plugin removes `android:maxSdkVersion` (and the now-unnecessary `tools:replace`)
 * from `READ_EXTERNAL_STORAGE` and `WRITE_EXTERNAL_STORAGE` in the app's own manifest, so
 * every source declares them consistently WITHOUT the attribute.
 *
 * Pass the permission names via the plugin options `permissions` (array of strings) to make
 * the list configurable. Defaults to the two storage permissions.
 */
module.exports = function withStoragePermissionsMaxSdk(config, options) {
  const permissions = (options?.permissions ?? [
    'android.permission.READ_EXTERNAL_STORAGE',
    'android.permission.WRITE_EXTERNAL_STORAGE',
  ]).map((p) => (p.includes('.') ? p : `android.permission.${p}`));

  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    const usages = Array.isArray(manifest['uses-permission'])
      ? manifest['uses-permission']
      : [];

    if (!Array.isArray(manifest['uses-permission'])) {
      return config;
    }

    for (const permission of permissions) {
      const node = usages.find(
        (u) => u.$?.['android:name'] === permission,
      );
      if (!node) {
        continue;
      }
      // Remove the conflicting attribute so the declaration matches the libs.
      delete node.$['android:maxSdkVersion'];
      // `tools:replace` was only needed to force maxSdkVersion; drop it too.
      delete node.$['tools:replace'];
    }

    return config;
  });
};
