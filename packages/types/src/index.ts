/**
 * TaskTrove Types - Base Version
 *
 * Complete type system for TaskTrove with Zod schemas and TypeScript types.
 * This file re-exports from layered modules for better organization.
 */

// =============================================================================
// PRIMITIVE TYPES
// =============================================================================

export * from "#id";
export * from "#constants";
export * from "#validators";
export * from "#utils";

// =============================================================================
// CORE ENTITIES
// =============================================================================

export * from "#core";
export * from "#group";
export * from "#settings";

// =============================================================================
// SERIALIZATION
// =============================================================================

export * from "#serialization";

// =============================================================================
// API CONTRACTS
// =============================================================================

export * from "#api-requests";
export * from "#api-responses";

// =============================================================================
// DATA FILE
// =============================================================================

export * from "#data-file";

// =============================================================================
// FEATURE MODULES
// =============================================================================

export * from "#analytics";
export * from "#team";
export * from "#notifications";
export * from "#voice-commands";

// =============================================================================
// API ERRORS (keep existing)
// =============================================================================

export { ApiErrorCode, ApiErrorCodeSchema } from "#api-errors";

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Generic linked list node
 */
export interface LinkedListNode {
  /** Unique identifier */
  id: string;
  /** ID of the next item in the list */
  nextId: string | null;
}

/**
 * Date range for filtering and analytics
 */
export interface DateRange {
  /** Start date */
  start: Date;
  /** End date */
  end: Date;
}

/**
 * Time period options for analytics
 */
export type TimePeriod = "today" | "week" | "month" | "year";

/**
 * Color palette for themes
 */
export interface ColorPalette {
  /** Primary color */
  primary: string;
  /** Secondary color */
  secondary: string;
  /** Accent color */
  accent: string;
  /** Background color */
  background: string;
  /** Text color */
  text: string;
  /** Border color */
  border: string;
  /** Success color */
  success: string;
  /** Warning color */
  warning: string;
  /** Error color */
  error: string;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T = unknown> {
  /** Whether the request was successful */
  success: boolean;
  /** Response data */
  data?: T;
  /** Error message if unsuccessful */
  error?: string;
  /** Additional metadata */
  meta?: {
    /** Total count for paginated results */
    total?: number;
    /** Current page */
    page?: number;
    /** Items per page */
    limit?: number;
    /** Request timestamp */
    timestamp: Date;
  };
}

/**
 * Filter criteria for tasks
 */
export interface TaskFilter {
  /** Filter by project IDs */
  projectIds?: import("./id").ProjectId[];
  /** Filter by label names */
  labels?: string[];
  /** Filter by priority levels */
  priorities?: Array<1 | 2 | 3 | 4>;
  /** Filter by completion status */
  completed?: boolean;
  /** Filter by due date range */
  dueDateRange?: {
    start?: Date;
    end?: Date;
  };
  /** Filter by assigned team members */
  assignedTo?: import("./id").UserId[];
  /** Filter by task status */
  status?: string[];
  /** Search query for title/description */
  searchQuery?: string;
}

/**
 * Sort configuration
 */
export interface SortConfig {
  /** Field to sort by */
  field: string;
  /** Sort direction */
  direction: "asc" | "desc";
}

/**
 * Sync status for data synchronization
 */
export type SyncStatus = "idle" | "syncing" | "error" | "success";

/**
 * Sync configuration
 */
export interface SyncConfig {
  /** Whether auto-sync is enabled */
  autoSync: boolean;
  /** Sync interval in milliseconds */
  syncInterval: number;
  /** Whether to sync on window focus */
  syncOnFocus: boolean;
  /** Whether to sync on network reconnection */
  syncOnReconnect: boolean;
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Delay between retry attempts in milliseconds */
  retryDelay: number;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  /** Last sync timestamp */
  lastSync?: Date;
  /** Current sync status */
  syncStatus: SyncStatus;
  /** Number of pending changes */
  pendingChanges: number;
  /** Average sync duration in milliseconds */
  avgSyncDuration: number;
  /** Number of sync errors in current session */
  syncErrors: number;
  /** App loading time in milliseconds */
  loadTime: number;
  /** Memory usage in MB */
  memoryUsage?: number;
}
