# Drag and Drop Implementation Guide

## Overview

TaskTrove uses [Atlassian's Pragmatic Drag and Drop](https://github.com/atlassian/pragmatic-drag-and-drop) library for drag and drop functionality. This guide explains the implementation patterns, shadow effects, and common pitfalls.

## Core Library Components

### Essential Imports

```typescript
// Core drag and drop adapters
import { draggable } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"

// Edge detection for precise drop positioning
import {
  extractClosestEdge,
  attachClosestEdge,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge"
import { getReorderDestinationIndex } from "@atlaskit/pragmatic-drag-and-drop-hitbox/util/get-reorder-destination-index"
```

## Architecture Components

### 1. DraggableWrapper (`components/ui/draggable-wrapper.tsx`)

Wraps any element to make it draggable:

```typescript
<DraggableWrapper
  dragId={task.id}
  index={taskIndex}
  getData={() => ({
    type: "task",
    taskId: task.id,
    sectionId: section.id,
    projectId: task.projectId,
  })}
>
  <TaskItem taskId={task.id} />
</DraggableWrapper>
```

**Key Features:**

- Captures element dimensions via `getBoundingClientRect()` during drag start
- Includes `rect` in drag data for shadow rendering
- Manages drag state internally

### 2. DropTargetWrapper (`components/ui/drop-target-wrapper.tsx`)

Creates drop zones that respond to dragged items:

```typescript
<DropTargetWrapper
  dropTargetId={`task-${task.id}`}
  onDrop={handleTaskDrop}
  getData={(args) => {
    const baseData = { type: "task-drop-target", taskId: task.id }

    // CRITICAL: Only attach edge data when we have valid input
    if (args?.input && args?.element && isDragInput(args.input)) {
      return attachClosestEdge(baseData, {
        element: args.element,
        input: args.input,
        allowedEdges: ["top", "bottom"],
      })
    }
    return baseData
  }}
  onDragEnter={handleDragEnter}
  onDrag={handleDrag}
  onDragLeave={handleDragLeave}
>
  {children}
</DropTargetWrapper>
```

**Event Handlers:**

- `onDragEnter`: Track when drag enters
- `onDrag`: Update during drag movement
- `onDragLeave`: Clean up when leaving
- `onDrop`: Handle the drop action

## Shadow Effect Implementation

### Shadow Component (`components/ui/custom/task-shadow.tsx`)

```typescript
export function TaskShadow({ height, className }: TaskShadowProps) {
  return (
    <div
      className={cn(
        "flex-shrink-0 rounded-md bg-muted/30 border-2 border-dashed border-muted-foreground/20",
        className
      )}
      style={{ height }}
    />
  )
}
```

### State Management Pattern

Track drag state per container (section/column):

```typescript
const [sectionDragStates, setSectionDragStates] = useState<
  Map<
    string,
    {
      isDraggingOver: boolean
      draggedTaskRect?: { height: number }
      closestEdge?: "top" | "bottom"
      targetTaskId?: string
      isOverChildTask?: boolean
    }
  >
>(new Map())
```

### Shadow Positioning Logic

Three shadow positions based on drag location:

1. **Above task** - When `closestEdge === "top"`
2. **Below task** - When `closestEdge === "bottom"`
3. **Bottom of container** - When over container but not over any task

```typescript
{/* Shadow above task */}
{dragState?.targetTaskId === task.id &&
 dragState?.closestEdge === "top" && (
  <TaskShadow height={dragState.draggedTaskRect.height} />
)}

<TaskItem taskId={task.id} />

{/* Shadow below task */}
{dragState?.targetTaskId === task.id &&
 dragState?.closestEdge === "bottom" && (
  <TaskShadow height={dragState.draggedTaskRect.height} />
)}
```

## Critical Caveats and Solutions

### 1. Type Safety for Drag Data

**Problem:** Drag data from `source.data` is `Record<string, unknown>`

**Solution:** Validate at runtime with proper type guards:

```typescript
// BAD - Type assertion
const rect = source.data.rect as DOMRect // Never do this!

// GOOD - Runtime validation
const rect = source.data.rect
if (typeof rect === "object" && rect !== null && "height" in rect) {
  const height = rect.height
  if (typeof height === "number") {
    // Safe to use height
  }
}
```

### 2. Edge Detection Input Validation

**Problem:** `attachClosestEdge` requires valid `DragInputType`

**Solution:** Type guard for drag input:

```typescript
function isDragInput(input: unknown): input is DragInputType {
  return (
    typeof input === "object" &&
    input !== null &&
    "altKey" in input &&
    "button" in input &&
    "buttons" in input &&
    "ctrlKey" in input
  )
}
```

### 3. State Cleanup on Drop

**Problem:** Drag state persists after drop

**Solution:** Always clean up in drop handler:

```typescript
onDrop={(data) => {
  handleTaskDrop(data)
  setSectionDragStates(new Map())  // Clear all drag states
}}
```

### 4. Nested Drop Targets

**Problem:** Multiple drop targets can be active simultaneously

**Solution:** Check innermost target first:

```typescript
const innerMost = location.current.dropTargets[0]
const isOverChildTask = Boolean(innerMost && innerMost.data.type === "task-drop-target")
```

## Reordering Logic

Use Atlassian's utility for calculating drop position:

```typescript
const closestEdgeOfTarget = extractClosestEdge(taskDropTarget.data)
const targetIndex = getReorderDestinationIndex({
  startIndex: sourceIndex,
  closestEdgeOfTarget,
  indexOfTarget,
  axis: "vertical", // or "horizontal" for kanban
})
```

## Complete Implementation Example

See these files for complete implementations:

- **Vertical list with sections:** `components/task/project-sections-view.tsx` - `renderSection` function
- **Kanban board:** `components/views/kanban-board.tsx` - `KanbanBoard` component
- **Drag/Drop wrappers:** `components/ui/draggable-wrapper.tsx`, `components/ui/drop-target-wrapper.tsx`

## Testing Drag and Drop

Tests should mock the drag and drop behavior:

```typescript
// See: components/ui/draggable-wrapper.test.tsx
const mockDraggable = vi.fn()
vi.mock("@atlaskit/pragmatic-drag-and-drop/element/adapter", () => ({
  draggable: mockDraggable,
}))
```

## Performance Considerations

1. **Use Maps for state** - O(1) lookups for drag state per container
2. **Conditional rendering** - Only render shadows when needed
3. **Memoize callbacks** - Prevent unnecessary re-renders

## External Resources

- [Pragmatic Drag and Drop Documentation](https://atlassian.design/components/pragmatic-drag-and-drop)
- [Board with Shadows Example](https://atlassian.design/components/pragmatic-drag-and-drop/examples#board-with-shadows)
- [Example Source Code](https://github.com/alexreardon/pragmatic-board)
- [Closest Edge Detection](https://atlassian.design/components/pragmatic-drag-and-drop/packages/hitbox/closest-edge)

## Common Patterns

### Cross-Section Movement

```typescript
if (sourceSectionId !== targetSectionId) {
  moveTaskBetweenSections({
    taskId,
    projectId,
    newSectionId: createSectionId(targetSectionId),
    toIndex: targetIndex,
  })
} else {
  reorderTaskInView({
    taskId,
    viewId,
    fromIndex: sourceIndex,
    toIndex: targetIndex,
  })
}
```

### Preventing Same-Position Drops

```typescript
if (sourceSectionId === targetSectionId && sourceIndex === targetIndex) {
  return // No action needed
}
```

## Debugging Tips

1. **Log drop target data:** Add `console.log(location.current.dropTargets)` to understand target hierarchy
2. **Visualize edges:** Temporarily add borders to show top/bottom edge detection
3. **Check drag data:** Log `source.data` to verify all required fields are present
4. **Monitor state changes:** Use React DevTools to watch drag state Maps

## Key Takeaways

- Always validate drag data at runtime
- Clean up state on drop completion
- Use proper type guards, never type assertions
- Leverage Atlassian's utilities for edge detection and reordering
- Test shadow positioning in both list and kanban views
- Reference the working implementations in TaskTrove codebase
