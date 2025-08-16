# API Routes

All API routes return success data or ErrorResponse on failure.

## Tasks - `/api/tasks`

### GET

- Request: None
- Response: `DataFileSerialization | ErrorResponse`

### POST

- Request: `CreateTaskRequestSchema`
- Response: `CreateTaskResponse | ErrorResponse`

### PATCH

- Request: `TaskUpdateUnionSchema` (single or array)
- Response: `UpdateTaskResponse | ErrorResponse`

### DELETE

- Request: `DeleteTaskRequestSchema`
- Response: `DeleteTaskResponse | ErrorResponse`

## Projects - `/api/projects`

### GET

- Request: None
- Response: `DataFileSerialization | ErrorResponse`

### POST

- Request: `CreateProjectRequestSchema`
- Response: `CreateProjectResponse | ErrorResponse`

### PATCH

- Request: `ProjectUpdateUnionSchema` (single or array)
- Response: `UpdateProjectResponse | ErrorResponse`

### DELETE

- Request: `DeleteProjectRequestSchema`
- Response: `DeleteProjectResponse | ErrorResponse`

## Labels - `/api/labels`

### GET

- Request: None
- Response: `DataFileSerialization | ErrorResponse`

### POST

- Request: `CreateLabelRequestSchema`
- Response: `CreateLabelResponse | ErrorResponse`

### PATCH

- Request: `LabelUpdateUnionSchema` (single or array)
- Response: `UpdateLabelResponse | ErrorResponse`

### DELETE

- Request: `DeleteLabelRequestSchema`
- Response: `DeleteLabelResponse | ErrorResponse`

## Ordering - `/api/ordering`

### GET

- Request: None
- Response: `DataFileSerialization | ErrorResponse`

### PATCH

- Request: `OrderingUpdateRequestSchema`
- Response: `OrderingUpdateResponse | ErrorResponse`

---

All schemas and types are defined in `lib/types/index.ts`.
