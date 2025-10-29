/**
 * Environment and build configuration utilities
 */

export const isPro = (): boolean => {
  return false
}

/**
 * Check if the application is running in development mode
 */
export const isDev = (): boolean => {
  return process.env.NODE_ENV === "development"
}

/**
 * Check if authentication is enabled
 * Auth is enabled when AUTH_SECRET environment variable is set and not empty
 */
export const isAuthEnabled = (): boolean => {
  const secret = process.env.AUTH_SECRET
  return Boolean(secret && secret.trim())
}
