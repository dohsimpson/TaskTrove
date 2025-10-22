/**
 * Debug components for development environment only
 *
 * These components provide development utilities and should never
 * be included in production builds.
 */

export { ProjectSectionDebugBadge } from "./project-section-debug-badge"
export { SoundTester } from "./sound-tester"
export { TaskDebugBadge } from "./task-debug-badge"
export { StubIndicator } from "./stub-indicator"
export { VirtualizationDebugBadge } from "./virtualization-debug-badge"

// Helper function to check if we're in development mode
export const isDevelopment = () => process.env.NODE_ENV === "development"
