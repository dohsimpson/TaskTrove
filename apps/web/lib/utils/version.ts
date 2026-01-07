import packageJson from "web/package.json"

export interface AppVersionInfo {
  version: string
  native: boolean
}

/**
 * Get the current application version from package.json
 *
 * @returns The version string (e.g., "0.8.0")
 */
export async function getAppVersion(): Promise<AppVersionInfo> {
  return {
    version: packageJson.version,
    native: false,
  }
}
