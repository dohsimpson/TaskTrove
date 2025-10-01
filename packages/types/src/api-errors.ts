/**
 * API Error Codes
 *
 * This module defines standardized error codes for the TaskTrove API to enable
 * machine-readable error handling. Each error code follows the pattern:
 * RESOURCE_ACTION_ERROR or CATEGORY_ERROR
 *
 * Error codes are designed to be:
 * - Machine-readable: Clients can programmatically handle specific errors
 * - Language-independent: Not tied to human-readable error messages
 * - Stable: Error codes remain consistent across API versions
 * - Specific: Granular enough to distinguish between different error scenarios
 */

import { z } from "zod";

/**
 * Standardized API error codes
 *
 * Naming convention: RESOURCE_ACTION_ERROR or CATEGORY_ERROR
 * - RESOURCE: The entity type (TASK, PROJECT, LABEL, etc.)
 * - ACTION: The operation being performed (NOT_FOUND, CREATE, UPDATE, etc.)
 * - ERROR: Literal suffix to indicate error type
 */
export enum ApiErrorCode {
  // =============================================================================
  // VALIDATION ERRORS (4xx)
  // =============================================================================

  /**
   * Generic validation error for request data that doesn't meet schema requirements
   * Used when: Zod validation fails on request body or query parameters
   */
  VALIDATION_ERROR = "VALIDATION_ERROR",

  /**
   * Request body is invalid or malformed
   * Used when: JSON parsing fails or body structure is incorrect
   */
  INVALID_REQUEST_BODY = "INVALID_REQUEST_BODY",

  /**
   * Query parameters are invalid or missing required values
   * Used when: URL query string validation fails
   */
  INVALID_QUERY_PARAMS = "INVALID_QUERY_PARAMS",

  /**
   * API version is not supported
   * Used when: X-API-Version header specifies an unsupported version
   */
  UNSUPPORTED_API_VERSION = "UNSUPPORTED_API_VERSION",

  // =============================================================================
  // AUTHENTICATION & AUTHORIZATION ERRORS (401, 403)
  // =============================================================================

  /**
   * User must authenticate before accessing this resource
   * Used when: No valid session or token provided
   */
  AUTHENTICATION_REQUIRED = "AUTHENTICATION_REQUIRED",

  /**
   * Authentication attempt failed
   * Used when: Login credentials are rejected
   */
  AUTHENTICATION_FAILED = "AUTHENTICATION_FAILED",

  /**
   * User lacks permission to perform this action
   * Used when: Authenticated but not authorized for the operation
   */
  AUTHORIZATION_DENIED = "AUTHORIZATION_DENIED",

  /**
   * Provided credentials are invalid
   * Used when: Username/password combination is incorrect
   */
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",

  /**
   * User session has expired and must re-authenticate
   * Used when: Session token is expired
   */
  SESSION_EXPIRED = "SESSION_EXPIRED",

  // =============================================================================
  // RESOURCE ERRORS (404, 409)
  // =============================================================================

  /**
   * API endpoint does not exist
   * Used when: Requested API route is not defined
   */
  ENDPOINT_NOT_FOUND = "ENDPOINT_NOT_FOUND",

  /**
   * Generic resource not found error
   * Used when: Requested resource doesn't exist and no specific type applies
   */
  RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND",

  /**
   * Requested task does not exist
   * Used when: Task ID not found in data store
   */
  TASK_NOT_FOUND = "TASK_NOT_FOUND",

  /**
   * Requested project does not exist
   * Used when: Project ID not found in data store
   */
  PROJECT_NOT_FOUND = "PROJECT_NOT_FOUND",

  /**
   * Requested label does not exist
   * Used when: Label ID not found in data store
   */
  LABEL_NOT_FOUND = "LABEL_NOT_FOUND",

  /**
   * Requested group does not exist
   * Used when: Group ID not found in data store
   */
  GROUP_NOT_FOUND = "GROUP_NOT_FOUND",

  /**
   * Resource conflicts with existing data
   * Used when: Operation would violate data integrity constraints
   */
  RESOURCE_CONFLICT = "RESOURCE_CONFLICT",

  /**
   * Resource with same identifier already exists
   * Used when: Attempting to create duplicate resource
   */
  DUPLICATE_RESOURCE = "DUPLICATE_RESOURCE",

  // =============================================================================
  // FILE OPERATION ERRORS (500)
  // =============================================================================

  /**
   * Failed to read data file from disk
   * Used when: File system read operation fails
   */
  DATA_FILE_READ_ERROR = "DATA_FILE_READ_ERROR",

  /**
   * Failed to write data file to disk
   * Used when: File system write operation fails
   */
  DATA_FILE_WRITE_ERROR = "DATA_FILE_WRITE_ERROR",

  /**
   * Failed to parse data file contents
   * Used when: JSON parsing or deserialization fails
   */
  DATA_FILE_PARSE_ERROR = "DATA_FILE_PARSE_ERROR",

  /**
   * Data file validation failed against schema
   * Used when: File contents don't match expected structure
   */
  DATA_FILE_VALIDATION_ERROR = "DATA_FILE_VALIDATION_ERROR",

  /**
   * Requested asset file not found
   * Used when: Static asset or upload doesn't exist
   */
  ASSET_NOT_FOUND = "ASSET_NOT_FOUND",

  /**
   * Asset path is invalid or contains forbidden patterns
   * Used when: Path traversal detected or invalid file path
   */
  INVALID_ASSET_PATH = "INVALID_ASSET_PATH",

  // =============================================================================
  // RATE LIMITING (429)
  // =============================================================================

  /**
   * API rate limit exceeded
   * Used when: Too many requests from client within time window
   */
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",

  // =============================================================================
  // SERVER ERRORS (500, 503)
  // =============================================================================

  /**
   * Generic internal server error
   * Used when: Unexpected server-side error occurs
   */
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",

  /**
   * Service is temporarily unavailable
   * Used when: Server is under maintenance or overloaded
   */
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",

  // =============================================================================
  // MIGRATION ERRORS
  // =============================================================================

  /**
   * Data file requires migration to current version
   * Used when: Data file version is outdated
   */
  MIGRATION_REQUIRED = "MIGRATION_REQUIRED",

  /**
   * Migration operation failed
   * Used when: Data migration encounters errors
   */
  MIGRATION_FAILED = "MIGRATION_FAILED",

  // =============================================================================
  // INITIALIZATION ERRORS
  // =============================================================================

  /**
   * Data file needs initialization
   * Used when: Data file doesn't exist and needs to be created
   */
  INITIALIZATION_REQUIRED = "INITIALIZATION_REQUIRED",

  /**
   * Initialization operation failed
   * Used when: Failed to initialize data file or application state
   */
  INITIALIZATION_FAILED = "INITIALIZATION_FAILED",

  /**
   * Initialization is forbidden in current state
   * Used when: Attempting to initialize when already initialized
   */
  INITIALIZATION_FORBIDDEN = "INITIALIZATION_FORBIDDEN",

  // =============================================================================
  // SETUP ERRORS
  // =============================================================================

  /**
   * Initial setup is required before using the application
   * Used when: User hasn't completed onboarding
   */
  SETUP_REQUIRED = "SETUP_REQUIRED",

  /**
   * Setup has already been completed
   * Used when: Attempting to run setup again
   */
  SETUP_ALREADY_COMPLETED = "SETUP_ALREADY_COMPLETED",

  // =============================================================================
  // BACKUP ERRORS
  // =============================================================================

  /**
   * Backup operation failed
   * Used when: Unable to create or restore backup
   */
  BACKUP_FAILED = "BACKUP_FAILED",

  // =============================================================================
  // IMPORT ERRORS
  // =============================================================================

  /**
   * Import operation failed
   * Used when: Data import encounters errors
   */
  IMPORT_FAILED = "IMPORT_FAILED",

  /**
   * Import file format is invalid or unsupported
   * Used when: Import file doesn't match expected format
   */
  INVALID_IMPORT_FORMAT = "INVALID_IMPORT_FORMAT",

  // =============================================================================
  // SECURITY ERRORS (400, 403)
  // =============================================================================

  /**
   * Path traversal attempt detected
   * Used when: Request path contains .. or other traversal patterns
   */
  PATH_TRAVERSAL_DETECTED = "PATH_TRAVERSAL_DETECTED",

  /**
   * Request origin is not allowed
   * Used when: CORS validation fails
   */
  INVALID_ORIGIN = "INVALID_ORIGIN",
}

/**
 * Zod schema for runtime validation of error codes
 * Ensures that error codes used in responses are valid enum values
 */
export const ApiErrorCodeSchema = z.nativeEnum(ApiErrorCode);

/**
 * Type alias for ApiErrorCode (inferred from Zod schema)
 */
export type ApiErrorCodeType = z.infer<typeof ApiErrorCodeSchema>;
