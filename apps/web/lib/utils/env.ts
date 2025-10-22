/**
 * Environment and build configuration utilities
 */

/**
 * Check if the application is running in Pro mode
 * Pro mode is determined by the NEXT_PUBLIC_IS_PRO environment variable
 */
export const isPro = (): boolean => {
  return process.env.NEXT_PUBLIC_IS_PRO === "true"
}

/**
 * Check if the application is running in development mode
 */
export const isDevelopment = (): boolean => {
  return process.env.NODE_ENV === "development"
}

/**
 * Check if authentication is enabled
 * Auth is enabled when AUTH_SECRET environment variable is set
 */
export const isAuthEnabled = (): boolean => {
  return Boolean(process.env.AUTH_SECRET)
}
