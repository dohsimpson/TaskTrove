# API Error Codes

This document provides a comprehensive reference for all standardized error codes used in the TaskTrove API. Error codes enable machine-readable error handling and provide consistent, language-independent error identification.

## Overview

All API error responses follow a standardized format:

```typescript
{
  code: string          // Machine-readable error code (enum value)
  error: string         // Human-readable error title
  message: string       // Detailed error message with context
  stack?: string        // Stack trace (development only)
  filePath?: string     // File path related to error (if applicable)
}
```

## Error Code Categories

Error codes are organized into functional categories for easy reference:

- **Validation Errors** (400): Request data validation failures
- **Authentication & Authorization** (401, 403): Access control errors
- **Resource Errors** (404, 409): Resource not found or conflict errors
- **File Operations** (500): Data file read/write failures
- **Rate Limiting** (429): Request throttling
- **Server Errors** (500, 503): Internal server issues
- **Migration**: Data migration errors
- **Initialization**: Application setup errors
- **Setup**: Initial configuration errors
- **Backup**: Backup operation failures
- **Import**: Data import errors
- **Security** (400, 403): Security-related errors

## Error Code Reference

### Validation Errors (4xx)

#### `VALIDATION_ERROR`

- **HTTP Status**: 400
- **Description**: Generic validation error when request data doesn't meet schema requirements
- **When Used**: Zod validation fails on request body or query parameters
- **Example**:
  ```json
  {
    "code": "VALIDATION_ERROR",
    "error": "Validation failed",
    "message": "Invalid task data: priority must be between 1 and 4"
  }
  ```

#### `INVALID_REQUEST_BODY`

- **HTTP Status**: 400
- **Description**: Request body is malformed or cannot be parsed
- **When Used**: JSON parsing fails or body structure is incorrect
- **Example**:
  ```json
  {
    "code": "INVALID_REQUEST_BODY",
    "error": "Invalid JSON in request body",
    "message": "Unexpected token } in JSON at position 42"
  }
  ```

#### `INVALID_QUERY_PARAMS`

- **HTTP Status**: 400
- **Description**: URL query parameters are invalid or missing required values
- **When Used**: Query string validation fails
- **Example**:
  ```json
  {
    "code": "INVALID_QUERY_PARAMS",
    "error": "Invalid query parameters",
    "message": "Parameter 'limit' must be a positive integer"
  }
  ```

### Authentication & Authorization (401, 403)

#### `AUTHENTICATION_REQUIRED`

- **HTTP Status**: 401
- **Description**: User must authenticate before accessing resource
- **When Used**: No valid session or token provided
- **Example**:
  ```json
  {
    "code": "AUTHENTICATION_REQUIRED",
    "error": "Authentication required",
    "message": "Please log in to access this resource"
  }
  ```

#### `AUTHENTICATION_FAILED`

- **HTTP Status**: 401
- **Description**: Authentication attempt was rejected
- **When Used**: Login credentials are incorrect
- **Example**:
  ```json
  {
    "code": "AUTHENTICATION_FAILED",
    "error": "Authentication failed",
    "message": "Invalid username or password"
  }
  ```

#### `AUTHORIZATION_DENIED`

- **HTTP Status**: 403
- **Description**: User lacks permission for this action
- **When Used**: Authenticated but not authorized for the operation
- **Example**:
  ```json
  {
    "code": "AUTHORIZATION_DENIED",
    "error": "Authorization denied",
    "message": "You do not have permission to delete this project"
  }
  ```

#### `INVALID_CREDENTIALS`

- **HTTP Status**: 401
- **Description**: Provided credentials are invalid
- **When Used**: Username/password combination is incorrect
- **Example**:
  ```json
  {
    "code": "INVALID_CREDENTIALS",
    "error": "Invalid credentials",
    "message": "The provided credentials are not valid"
  }
  ```

#### `SESSION_EXPIRED`

- **HTTP Status**: 401
- **Description**: User session has expired
- **When Used**: Session token has expired and requires re-authentication
- **Example**:
  ```json
  {
    "code": "SESSION_EXPIRED",
    "error": "Session expired",
    "message": "Your session has expired. Please log in again."
  }
  ```

### Resource Errors (404, 409)

#### `RESOURCE_NOT_FOUND`

- **HTTP Status**: 404
- **Description**: Generic resource not found error
- **When Used**: Requested resource doesn't exist and no specific type applies
- **Example**:
  ```json
  {
    "code": "RESOURCE_NOT_FOUND",
    "error": "Resource not found",
    "message": "The requested resource does not exist"
  }
  ```

#### `TASK_NOT_FOUND`

- **HTTP Status**: 404
- **Description**: Requested task does not exist
- **When Used**: Task ID not found in data store
- **Example**:
  ```json
  {
    "code": "TASK_NOT_FOUND",
    "error": "Task not found",
    "message": "Task with ID '123e4567-e89b-12d3-a456-426614174000' does not exist"
  }
  ```

#### `PROJECT_NOT_FOUND`

- **HTTP Status**: 404
- **Description**: Requested project does not exist
- **When Used**: Project ID not found in data store
- **Example**:
  ```json
  {
    "code": "PROJECT_NOT_FOUND",
    "error": "Project not found",
    "message": "Project with ID '123e4567-e89b-12d3-a456-426614174000' does not exist"
  }
  ```

#### `LABEL_NOT_FOUND`

- **HTTP Status**: 404
- **Description**: Requested label does not exist
- **When Used**: Label ID not found in data store
- **Example**:
  ```json
  {
    "code": "LABEL_NOT_FOUND",
    "error": "Label not found",
    "message": "Label with ID '123e4567-e89b-12d3-a456-426614174000' does not exist"
  }
  ```

#### `GROUP_NOT_FOUND`

- **HTTP Status**: 404
- **Description**: Requested group does not exist
- **When Used**: Group ID not found in data store
- **Example**:
  ```json
  {
    "code": "GROUP_NOT_FOUND",
    "error": "Group not found",
    "message": "Group with ID '123e4567-e89b-12d3-a456-426614174000' does not exist"
  }
  ```

#### `RESOURCE_CONFLICT`

- **HTTP Status**: 409
- **Description**: Resource conflicts with existing data
- **When Used**: Operation would violate data integrity constraints
- **Example**:
  ```json
  {
    "code": "RESOURCE_CONFLICT",
    "error": "Resource conflict",
    "message": "Cannot delete project because it contains active tasks"
  }
  ```

#### `DUPLICATE_RESOURCE`

- **HTTP Status**: 409
- **Description**: Resource with same identifier already exists
- **When Used**: Attempting to create duplicate resource
- **Example**:
  ```json
  {
    "code": "DUPLICATE_RESOURCE",
    "error": "Duplicate resource",
    "message": "A project with this name already exists"
  }
  ```

### File Operation Errors (500)

#### `DATA_FILE_READ_ERROR`

- **HTTP Status**: 500
- **Description**: Failed to read data file from disk
- **When Used**: File system read operation fails
- **Example**:
  ```json
  {
    "code": "DATA_FILE_READ_ERROR",
    "error": "Failed to read data file",
    "message": "File reading or validation failed"
  }
  ```

#### `DATA_FILE_WRITE_ERROR`

- **HTTP Status**: 500
- **Description**: Failed to write data file to disk
- **When Used**: File system write operation fails
- **Example**:
  ```json
  {
    "code": "DATA_FILE_WRITE_ERROR",
    "error": "Failed to save data",
    "message": "File writing failed"
  }
  ```

#### `DATA_FILE_PARSE_ERROR`

- **HTTP Status**: 500
- **Description**: Failed to parse data file contents
- **When Used**: JSON parsing or deserialization fails
- **Example**:
  ```json
  {
    "code": "DATA_FILE_PARSE_ERROR",
    "error": "Failed to parse data file",
    "message": "Invalid JSON format in data file"
  }
  ```

#### `DATA_FILE_VALIDATION_ERROR`

- **HTTP Status**: 500
- **Description**: Data file validation failed against schema
- **When Used**: File contents don't match expected structure
- **Example**:
  ```json
  {
    "code": "DATA_FILE_VALIDATION_ERROR",
    "error": "Failed to serialize data file",
    "message": "Serialization failed"
  }
  ```

#### `ASSET_NOT_FOUND`

- **HTTP Status**: 404
- **Description**: Requested asset file not found
- **When Used**: Static asset or upload doesn't exist
- **Example**:
  ```json
  {
    "code": "ASSET_NOT_FOUND",
    "error": "Asset not found",
    "message": "The requested asset file does not exist"
  }
  ```

#### `INVALID_ASSET_PATH`

- **HTTP Status**: 400
- **Description**: Asset path is invalid or contains forbidden patterns
- **When Used**: Path validation fails or malformed path
- **Example**:
  ```json
  {
    "code": "INVALID_ASSET_PATH",
    "error": "Invalid asset path",
    "message": "No asset path provided in request"
  }
  ```

### Rate Limiting (429)

#### `RATE_LIMIT_EXCEEDED`

- **HTTP Status**: 429
- **Description**: API rate limit exceeded
- **When Used**: Too many requests from client within time window
- **Example**:
  ```json
  {
    "code": "RATE_LIMIT_EXCEEDED",
    "error": "Rate limit exceeded",
    "message": "Too many requests. Please try again in 60 seconds."
  }
  ```

### Server Errors (500, 503)

#### `INTERNAL_SERVER_ERROR`

- **HTTP Status**: 500
- **Description**: Generic internal server error
- **When Used**: Unexpected server-side error occurs
- **Example**:
  ```json
  {
    "code": "INTERNAL_SERVER_ERROR",
    "error": "Internal server error",
    "message": "An unexpected error occurred"
  }
  ```

#### `SERVICE_UNAVAILABLE`

- **HTTP Status**: 503
- **Description**: Service is temporarily unavailable
- **When Used**: Server is under maintenance or overloaded
- **Example**:
  ```json
  {
    "code": "SERVICE_UNAVAILABLE",
    "error": "Service unavailable",
    "message": "The service is temporarily unavailable. Please try again later."
  }
  ```

### Migration Errors

#### `MIGRATION_REQUIRED`

- **HTTP Status**: 400
- **Description**: Data file requires migration to current version
- **When Used**: Data file version is outdated
- **Example**:
  ```json
  {
    "code": "MIGRATION_REQUIRED",
    "error": "Migration required",
    "message": "Data file version v1.0.0 requires migration to v2.0.0"
  }
  ```

#### `MIGRATION_FAILED`

- **HTTP Status**: 500
- **Description**: Migration operation failed
- **When Used**: Data migration encounters errors
- **Example**:
  ```json
  {
    "code": "MIGRATION_FAILED",
    "error": "Migration failed",
    "message": "Failed to migrate tasks: invalid date format"
  }
  ```

### Initialization Errors

#### `INITIALIZATION_REQUIRED`

- **HTTP Status**: 400
- **Description**: Data file needs initialization
- **When Used**: Data file doesn't exist and needs to be created
- **Example**:
  ```json
  {
    "code": "INITIALIZATION_REQUIRED",
    "error": "Initialization required",
    "message": "Data file does not exist and must be initialized"
  }
  ```

#### `INITIALIZATION_FAILED`

- **HTTP Status**: 500
- **Description**: Initialization operation failed
- **When Used**: Failed to initialize data file or application state
- **Example**:
  ```json
  {
    "code": "INITIALIZATION_FAILED",
    "error": "Failed to initialize data file",
    "message": "Permission denied when creating data file"
  }
  ```

#### `INITIALIZATION_FORBIDDEN`

- **HTTP Status**: 400
- **Description**: Initialization is forbidden in current state
- **When Used**: Attempting to initialize when already initialized
- **Example**:
  ```json
  {
    "code": "INITIALIZATION_FORBIDDEN",
    "error": "Data file already exists",
    "message": "Data file initialization is only allowed when no existing data file is present"
  }
  ```

### Setup Errors

#### `SETUP_REQUIRED`

- **HTTP Status**: 400
- **Description**: Initial setup is required before using the application
- **When Used**: User hasn't completed onboarding
- **Example**:
  ```json
  {
    "code": "SETUP_REQUIRED",
    "error": "Setup required",
    "message": "Please complete the initial setup before continuing"
  }
  ```

#### `SETUP_ALREADY_COMPLETED`

- **HTTP Status**: 400
- **Description**: Setup has already been completed
- **When Used**: Attempting to run setup again
- **Example**:
  ```json
  {
    "code": "SETUP_ALREADY_COMPLETED",
    "error": "Setup already completed",
    "message": "Initial setup has already been completed"
  }
  ```

### Backup Errors

#### `BACKUP_FAILED`

- **HTTP Status**: 500
- **Description**: Backup operation failed
- **When Used**: Unable to create or restore backup
- **Example**:
  ```json
  {
    "code": "BACKUP_FAILED",
    "error": "Backup failed",
    "message": "Insufficient disk space to create backup"
  }
  ```

### Import Errors

#### `IMPORT_FAILED`

- **HTTP Status**: 500
- **Description**: Import operation failed
- **When Used**: Data import encounters errors
- **Example**:
  ```json
  {
    "code": "IMPORT_FAILED",
    "error": "Import failed",
    "message": "Failed to merge imported data with existing data"
  }
  ```

#### `INVALID_IMPORT_FORMAT`

- **HTTP Status**: 400
- **Description**: Import file format is invalid or unsupported
- **When Used**: Import file doesn't match expected format
- **Example**:
  ```json
  {
    "code": "INVALID_IMPORT_FORMAT",
    "error": "Invalid import data format",
    "message": "The uploaded file does not contain valid JSON data"
  }
  ```

### Security Errors (400, 403)

#### `PATH_TRAVERSAL_DETECTED`

- **HTTP Status**: 400
- **Description**: Path traversal attempt detected
- **When Used**: Request path contains .. or other traversal patterns
- **Example**:
  ```json
  {
    "code": "PATH_TRAVERSAL_DETECTED",
    "error": "Invalid asset path",
    "message": "Path traversal attempt detected"
  }
  ```

#### `INVALID_ORIGIN`

- **HTTP Status**: 403
- **Description**: Request origin is not allowed
- **When Used**: CORS validation fails or origin header is invalid
- **Example**:
  ```json
  {
    "code": "INVALID_ORIGIN",
    "error": "Forbidden",
    "message": "Invalid request origin"
  }
  ```

## Client Usage Examples

### TypeScript/JavaScript

```typescript
import { ApiErrorCode } from "@/lib/types";

async function createTask(taskData: CreateTaskRequest) {
  try {
    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(taskData),
    });

    if (!response.ok) {
      const error = await response.json();

      // Handle specific error codes
      switch (error.code) {
        case ApiErrorCode.VALIDATION_ERROR:
          console.error("Validation failed:", error.message);
          // Show form validation errors to user
          break;

        case ApiErrorCode.DATA_FILE_WRITE_ERROR:
          console.error("Storage error:", error.message);
          // Show retry option to user
          break;

        case ApiErrorCode.AUTHENTICATION_REQUIRED:
          console.error("Not authenticated");
          // Redirect to login
          break;

        default:
          console.error("Unexpected error:", error);
      }

      return null;
    }

    return await response.json();
  } catch (err) {
    console.error("Network error:", err);
    return null;
  }
}
```

### Python

```python
import requests
from enum import Enum

class ApiErrorCode(str, Enum):
    VALIDATION_ERROR = "VALIDATION_ERROR"
    DATA_FILE_WRITE_ERROR = "DATA_FILE_WRITE_ERROR"
    AUTHENTICATION_REQUIRED = "AUTHENTICATION_REQUIRED"
    # ... other error codes

def create_task(task_data: dict):
    try:
        response = requests.post(
            'http://localhost:3000/api/tasks',
            json=task_data
        )

        if not response.ok:
            error = response.json()
            error_code = error.get('code')

            if error_code == ApiErrorCode.VALIDATION_ERROR:
                print(f"Validation failed: {error['message']}")
            elif error_code == ApiErrorCode.DATA_FILE_WRITE_ERROR:
                print(f"Storage error: {error['message']}")
            elif error_code == ApiErrorCode.AUTHENTICATION_REQUIRED:
                print("Not authenticated")
            else:
                print(f"Unexpected error: {error}")

            return None

        return response.json()
    except requests.RequestException as e:
        print(f"Network error: {e}")
        return None
```

## Error Handling Best Practices

### 1. Check HTTP Status First

Always check the HTTP status code before parsing the response body. Not all errors may include a JSON body.

### 2. Use Error Codes for Logic

Use error codes (not error messages) in your application logic. Error messages may change, but codes remain stable.

```typescript
// Good ✅
if (error.code === ApiErrorCode.TASK_NOT_FOUND) {
  // Handle missing task
}

// Bad ❌
if (error.message.includes("not found")) {
  // Message text may change
}
```

### 3. Provide User-Friendly Messages

Don't show raw error messages to end users. Map error codes to user-friendly messages in your language/locale.

```typescript
const ERROR_MESSAGES = {
  [ApiErrorCode.VALIDATION_ERROR]: "Please check your input and try again.",
  [ApiErrorCode.DATA_FILE_WRITE_ERROR]: "Unable to save. Please try again.",
  [ApiErrorCode.TASK_NOT_FOUND]: "This task no longer exists.",
};

const userMessage =
  ERROR_MESSAGES[error.code] || "An error occurred. Please try again.";
```

### 4. Log Complete Error Details

Log the complete error response (including stack traces in development) for debugging purposes.

### 5. Handle Network Errors

Always catch network-level errors separately from API errors.

```typescript
try {
  const response = await fetch("/api/tasks");
  // Handle API errors based on response status and error code
} catch (networkError) {
  // Handle network errors (no response received)
  console.error("Network error:", networkError);
}
```

### 6. Implement Retry Logic

For transient errors (500, 503), implement exponential backoff retry logic.

```typescript
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3,
) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);

      if (response.ok) {
        return response;
      }

      const error = await response.json();

      // Only retry on server errors
      if (
        error.code === ApiErrorCode.INTERNAL_SERVER_ERROR ||
        error.code === ApiErrorCode.SERVICE_UNAVAILABLE
      ) {
        if (i < maxRetries - 1) {
          await sleep(Math.pow(2, i) * 1000); // Exponential backoff
          continue;
        }
      }

      throw new Error(error.message);
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      await sleep(Math.pow(2, i) * 1000);
    }
  }
}
```

## Version History

- **v1.0.0** (2025-09-29): Initial release of standardized error code system
  - 40 error codes defined across 12 categories
  - Machine-readable error codes for all API endpoints
  - Comprehensive documentation with usage examples

## See Also

- [API Documentation](./README.md)
- [Type Definitions](/packages/types/src/api-errors.ts)
- [Error Response Schema](/packages/types/src/index.ts)
