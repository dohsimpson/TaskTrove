# Data Serialization Pattern

## Overview

TaskTrove uses a two-tier type system to handle data transformation between application state and API communication:

1. **Application Types**: Native TypeScript types used in app state (e.g., `Date` objects)
2. **Serialization Types**: Wire-format types used for API communication (e.g., formatted date strings)

## The Problem

Direct `JSON.stringify()` on application state with `Date` objects produces ISO format strings like `'2022-02-02T14:30:00.000Z'`, but our API expects specific formats like `'2022-02-02'` for dates.

## The Solution

Use Zod serialization schemas to transform data before API communication.

## Type Pairs

| Application Type | Serialization Type       | Purpose                                     |
| ---------------- | ------------------------ | ------------------------------------------- |
| `Task`           | `TaskSerialization`      | Individual task with proper date formatting |
| `Task[]`         | `TaskArraySerialization` | Array of tasks                              |
| `Project`        | `ProjectSerialization`   | Project data                                |
| `Label`          | `LabelSerialization`     | Label data                                  |
| `DataFile`       | `DataFileSerialization`  | Complete data file                          |

## Date/Time Serialization

The serialization schemas use specialized transformers:

- **`flexibleDateSerializationSchema`**: `Date` → `'yyyy-MM-dd'` (e.g., `'2022-02-02'`)
- **`flexibleDateTimeSerializationSchema`**: `Date` → ISO string (e.g., `'2022-02-02T14:30:00.000Z'`)
- **`flexibleTimeSerializationSchema`**: `Date` → `'HH:mm:ss'` (e.g., `'14:30:00'`)

## Usage Pattern in Mutation Atoms

```typescript
// ✅ CORRECT: Accept application types, serialize before sending
export const updateTasksMutationAtom = atomWithMutation<
  UpdateTaskResponse,
  TaskUpdateUnion, // Application type (dates as Date objects)
  Error,
  MutationContext<Task[], TaskUpdateUnion>
>((get) => ({
  mutationFn: async (tasks: TaskUpdateUnion): Promise<UpdateTaskResponse> => {
    // 1. Serialize application data to wire format
    const serialized = TaskArraySerializationSchema.safeParse(tasks)
    if (!serialized.success) {
      throw new Error(`Failed to serialize tasks: ${serialized.error.message}`)
    }

    // 2. Send serialized data to API
    const response = await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(serialized.data), // Now properly formatted
    })

    return response.json()
  },
}))
```

## ❌ Common Mistakes

```typescript
// DON'T: Direct JSON.stringify without serialization
body: JSON.stringify(tasks) // Date objects become ISO strings

// DON'T: Accept serialization types in mutation functions
mutationFn: async (tasks: TaskArraySerialization) // Should accept app types

// DON'T: Use validation schemas for serialization
const validated = TaskUpdateUnionSchema.safeParse(tasks) // Doesn't transform dates
```

## ✅ Best Practices

1. **Mutation Function Signatures**: Always accept application types
2. **Before API Calls**: Always serialize using appropriate `*SerializationSchema`
3. **Error Messages**: Use "serialize" in error messages, not "validate"
4. **Variable Names**: Use `serialized` for serialization results

## Example: Complete Flow

```typescript
// App state: dueDate is a Date object
const taskUpdate = {
  id: "task-123",
  title: "Updated task",
  dueDate: new Date("2022-02-02"), // Date object
}

// Serialize before sending
const serialized = TaskSerializationSchema.safeParse(taskUpdate)
// Result: { id: 'task-123', title: 'Updated task', dueDate: '2022-02-02' }

// Send to API
fetch("/api/tasks", {
  method: "PATCH",
  body: JSON.stringify(serialized.data), // Server gets properly formatted data
})
```

## Schema Files

- **Application Schemas**: `TaskSchema`, `ProjectSchema`, etc. in `lib/types/index.ts`
- **Serialization Schemas**: `TaskSerializationSchema`, `ProjectSerializationSchema`, etc. in `lib/types/index.ts`
- **Date Transformers**: `flexible*SerializationSchema` in `lib/types/index.ts`

This pattern ensures type safety, consistent data formatting, and clean separation between app state and wire format.
