/**
 * Debug components for development environment only
 *
 * These components provide development utilities and should never
 * be included in production builds.
 */

export { SoundTester } from "./sound-tester"

// Helper function to check if we're in development mode
export const isDevelopment = () => process.env.NODE_ENV === "development"
