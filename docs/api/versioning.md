# API Versioning

## Overview

The TaskTrove API uses URI path versioning to ensure backward compatibility and allow for breaking changes in future releases. All versioned endpoints are prefixed with `/api/v{version}`.

## Current Version

**Current API Version:** `v1`
**Supported Versions:** `v1`

## Version Negotiation

The API supports version negotiation through the `X-API-Version` header:

```bash
curl -H "X-API-Version: 1" https://api.tasktrove.example/api/v1/tasks
```

### Version Header Behavior

- **If provided**: The specified version will be validated against supported versions
- **If omitted**: Defaults to the current API version
- **If unsupported**: Returns `400 Bad Request` with `UNSUPPORTED_API_VERSION` error code

### Version Response Headers

All API responses include version information in headers:

- `X-API-Version`: The API version that processed the request

### Health Endpoint

The `/api/health` endpoint returns version information:

```json
{
  "status": "healthy",
  "apiVersion": "1",
  "supportedVersions": ["1"],
  "message": "All permission checks passed",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Versioned Endpoints

### Current Version (v1)

All endpoints under `/api/v1/` namespace:

- `/api/v1/tasks` - Task management
- `/api/v1/projects` - Project management
- `/api/v1/labels` - Label management
- `/api/v1/groups` - Group management
- `/api/v1/settings` - Settings management
- `/api/v1/user` - User management
- `/api/v1/data` - Complete data retrieval
- `/api/v1/backup` - Backup operations
- `/api/v1/import` - Data import
- `/api/v1/assets/**` - Static assets

### Legacy Endpoints

The non-versioned `/api/*` endpoints (e.g., `/api/tasks`) are still available and currently map to v1 functionality. These may be deprecated in future versions.

## Migration Guide

### Migrating to Versioned Endpoints

**Before (Non-versioned):**

```typescript
const response = await fetch("/api/tasks", {
  method: "GET",
  headers: {
    "Content-Type": "application/json",
  },
});
```

**After (Versioned):**

```typescript
const response = await fetch("/api/v1/tasks", {
  method: "GET",
  headers: {
    "Content-Type": "application/json",
    "X-API-Version": "1",
  },
});
```

### Benefits

1. **Explicit Version Control**: Version is clearly visible in the URL
2. **Backward Compatibility**: Old clients continue working when new versions are released
3. **Gradual Migration**: Teams can migrate at their own pace
4. **Clear Breaking Changes**: Version changes signal breaking changes

## Versioning Strategy

### What Triggers a New Version?

A new API version is required when:

- **Breaking Changes**: Changes that are not backward compatible
  - Removing or renaming fields in response payloads
  - Changing field types or structures
  - Removing endpoints
  - Changing authentication mechanisms
  - Modifying error response formats

### What Doesn't Require a New Version?

- **Additive Changes**: Adding new optional fields to responses
- **New Endpoints**: Adding new endpoints within the same version
- **Bug Fixes**: Fixing incorrect behavior
- **Performance Improvements**: Internal optimizations
- **Documentation Updates**: Clarifying existing behavior

## Version Lifecycle

### Support Policy

- **Current Version (v1)**: Fully supported, receives all updates
- **Previous Versions**: When v2 is released, v1 will be supported for a minimum of 6 months
- **Deprecated Versions**: Clear deprecation notices with sunset dates

### Deprecation Process

1. **Announcement**: Deprecation announced at least 6 months in advance
2. **Warning Headers**: Deprecated versions return `X-Deprecation-Warning` header
3. **Documentation**: Migration guides provided
4. **Sunset**: Version removed after deprecation period

## Error Responses

### Unsupported Version Error

**Request:**

```bash
curl -H "X-API-Version: 999" https://api.tasktrove.example/api/v1/tasks
```

**Response (400 Bad Request):**

```json
{
  "code": "UNSUPPORTED_API_VERSION",
  "error": "Unsupported API version",
  "message": "API version 999 is not supported. Supported versions: 1"
}
```

## Best Practices

### Client Implementation

1. **Always specify version**: Include `X-API-Version` header in requests
2. **Handle version errors**: Gracefully handle `UNSUPPORTED_API_VERSION` errors
3. **Monitor deprecation warnings**: Watch for `X-Deprecation-Warning` headers
4. **Use versioned URLs**: Prefer `/api/v1/...` over `/api/...`

### Version Management

```typescript
// Good: Explicit version
const API_VERSION = "1";
const baseUrl = "/api/v1";

// Bad: Hardcoded or missing version
const baseUrl = "/api";
```

### Error Handling

```typescript
async function apiRequest(endpoint: string) {
  const response = await fetch(`/api/v1${endpoint}`, {
    headers: {
      "X-API-Version": "1",
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.json();

    if (error.code === "UNSUPPORTED_API_VERSION") {
      // Handle version mismatch
      console.error("API version not supported:", error.message);
      // Potentially fallback or prompt user to update
    }

    throw new Error(error.message);
  }

  return response.json();
}
```

## Future Versions

When new versions are released:

1. Previous version documentation will be archived
2. Migration guides will be provided
3. Breaking changes will be clearly documented
4. Deprecation timeline will be announced

## Related Documentation

- [API Error Codes](./error-codes.md) - Complete list of error codes including `UNSUPPORTED_API_VERSION`
- [API Authentication](./authentication.md) - Authentication requirements per version
- [API Endpoints](./endpoints.md) - Complete endpoint reference

## Questions?

For questions about API versioning:

- Check the [GitHub Issues](https://github.com/dohsimpson/TaskTrove/issues)
- Review [Release Notes](../../CHANGELOG.md) for version history
