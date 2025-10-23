import packageJson from "web/package.json"

/**
 * Get the current application version from package.json
 *
 * @returns The version string (e.g., "0.8.0")
 */
export function getAppVersion(): string {
  return packageJson.version
}
