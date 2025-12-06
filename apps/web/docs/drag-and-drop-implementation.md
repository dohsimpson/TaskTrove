# Drag and Drop Implementation Guide

## Overview

TaskTrove relies on [Atlassian's Pragmatic Drag and Drop](https://github.com/atlassian/pragmatic-drag-and-drop) for all drag interactions. This document covers the core building blocks we use, how temporary sort resets work, shared drag state, testing strategies, and common pitfalls.

## Core Library Components

### Essential Imports

```ts
// element adapters
import { draggable } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"

// list hitboxes
import {
  attachInstruction as attachListInstruction,
  extractInstruction as extractListInstruction,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/list-item"

// reorder helpers
import { reorder } from "@atlaskit/pragmatic-drag-and-drop/reorder"
```

Hitboxes attach metadata to the drop target describing where the drag is relative to the item (before/after). We mostly use the list variants, but tree and group hitboxes are available for sidebar and container-level drops.

## Architecture Components

### `DraggableTaskElement`

Location: `components/task/draggable-task-element.tsx`

Wraps every task row (lists, subtasks, sidepanel) and provides:

- Pragmatic `draggable` registration through our shared `DraggableItem` wrapper.
- Multi-select support – if the dragged task is part of a selection, all selected task ids are included.
- Integration with `useResetSortOnDrag` so the view temporarily switches to the canonical order.
- Shared drag styling via `draggingTaskIdsAtom`, allowing virtualization re-mounts to keep the dimming effect.

```tsx
<DraggableTaskElement taskId={task.id}>
  <TaskItem taskId={task.id} />
</DraggableTaskElement>
```

### `DropTargetElement`

Location: `components/task/project-sections-view-helper.tsx`

Thin wrapper around `DropTargetItem` that:

- Configures list or group drop mode.
- Attaches hitboxes (`attachListInstruction` / `attachTreeInstruction`) as needed.
- Normalizes innermost target detection before firing `onDrop`.
- Adds auto-scroll support when inside a virtualized list.

Usage:

```tsx
<DropTargetElement
  id={task.id}
  options={{ type: "list-item", indicator: { lineGap: "8px" } }}
  onDrop={handleDropTaskToListItem}
>
  <DraggableTaskElement taskId={task.id}>
    <TaskItem taskId={task.id} />
  </DraggableTaskElement>
</DropTargetElement>
```

### Section-Level Handlers

Location: `components/task/section.tsx`

Sections provide two primary drop targets:

- `handleDropTaskToSection` → appends tasks to the end of the section when dropped onto empty space.
- `handleDropTaskToListItem` → reorders tasks relative to the drop target (supports cross-section moves).

Both handlers:

1. Extract task ids either from `extractDropPayload` or `source.data.ids`.
2. Move tasks between projects when required via `updateTasksAtom`.
3. Update the relevant sections/projects with `updateProjectsAtom` (using `reorderItems` when available).
4. Operate regardless of the current sort order—the temporary sort reset logic ensures state consistency.

## Temporary Sort Reset + Shared Drag State

### `useResetSortOnDrag`

Location: `hooks/use-reset-sort-on-drag.ts`

Responsibilities:

1. On drag start, if the current sort is not `"default"`, record the previous sort and call `setViewOptionsAtom` with `{ sortBy: "default", sortDirection: "asc" }`.
2. Track a global participation count so multiple components (e.g., virtualization re-renders) can join the same interaction without clobbering each other.
3. Attach window-level `dragend`/`drop` listeners to guarantee the previous sort is restored even if components unmount mid-drag.
4. Clear `draggingTaskIdsAtom` once the last participant completes.

The hook returns `{ applyDefaultSort, restorePreviousSort }` and is consumed by `DraggableTaskElement` and the side-panel drag handle.

### `draggingTaskIdsAtom`

Location: `packages/atoms/src/ui/drag.ts`

Shared atom tracking the ids currently being dragged. It powers:

- Dimming and scaling the dragged rows (works across virtualization re-mounts).
- Any future UI that needs to know the active drag payload (e.g., badge counts).

The atom is cleared once the drag finalizes—either via component `restorePreviousSort` calls or the global listener in the hook.

## Shadow Rendering

We still use the existing `TaskShadow` and `sectionDragStates` pattern to show placeholders where items will land. The critical pieces are:

- Record the dragged item height (`source.data.rect?.height`) so the shadow matches the item size.
- Render shadows above/below target items based on `instruction.operation`.
- Provide a fallback shadow at the bottom when hovering over a section without a target task.

See `project-sections-view.tsx` for the shadow logic driven by section-level state.

## Critical Caveats and Solutions

### Type Safety for Drag Data

Always validate the shape of `source.data`:

```ts
const maybeRect = source.data.rect
if (typeof maybeRect === "object" && maybeRect !== null && "height" in maybeRect) {
  const { height } = maybeRect as { height: number }
  // safe to use height
}
```

### Hitbox Input Validation

`attachListInstruction` requires a proper drag input. Use a type guard before attaching:

```ts
function isDragInput(input: unknown): input is DragInputType {
  return (
    typeof input === "object" &&
    input !== null &&
    "altKey" in input &&
    "button" in input &&
    "buttons" in input
  )
}
```

### Nested Drop Targets

Always inspect the first entry of `location.current.dropTargets` to ensure you are handling the innermost target. This prevents processing the same drop multiple times when there are nested wrappers.

### Sort Order vs. Manual Reorder

Never mutate section order based on UI-sort order unless the view is in `"default"` mode. Let `useResetSortOnDrag` temporarily enforce default ordering so the canonical section order is always the source of truth.

## Reordering Helpers

To calculate the new index for reordering within the same container, prefer Atlassian's helper:

```ts
const closestEdgeOfTarget = extractInstruction(target.data)?.operation
const destinationIndex = getReorderDestinationIndex({
  startIndex,
  closestEdgeOfTarget,
  indexOfTarget,
  axis: "vertical",
})
```

For cross-section moves, manually splice the dragged ids at the correct index and filter them out of other sections.

## Testing

### Polyfills

In `test-setup.ts` we polyfill DOMRect and DragEvent (pragmatic's unit testing polyfills are ESM and not currently available via pnpm). Ensure this file is listed in the Vitest `setupFiles`.

### Patterns

- **Hook tests** (`hooks/use-reset-sort-on-drag.test.tsx`): use Jotai's `createStore()` with `<Provider>` to assert sort state transitions and shared drag id cleanup. Dispatch `window.dispatchEvent(new Event("dragend"))` to emulate global drops.
- **Component tests** (`components/task/draggable-task-element.test.tsx`): mock `DraggableItem`, call captured `onDragStart`/`onDrop`, and verify both sort state and `draggingTaskIdsAtom`.
- **Section tests**: mock `DropTargetElement` to capture `onDrop`, then invoke the handler with a crafted payload to validate project/task updates. (TODO: add coverage for cross-section moves and multi-select.)

### Example Mock

```ts
const handlers: { onDragStart?: () => void; onDrop?: () => void } = {}

vi.mock("@/components/ui/drag-drop/draggable-item", () => ({
  DraggableItem: ({ onDragStart, onDrop, children }: PropsWithChildren<DraggableProps>) => {
    handlers.onDragStart = onDragStart
    handlers.onDrop = onDrop
    return <div>{children}</div>
  },
}))
```

This pattern bypasses complex DOM event simulation and keeps tests focused on business logic.

## Performance Notes

- Virtualization (`VirtualizedTaskList`) dramatically reduces DOM nodes; ensure drag wrappers integrate seamlessly with the virtualizer's measure callbacks.
- Memoize heavy drop handlers with `useCallback`.
- Avoid per-render Map recreation; store drag state in `useRef` or `useState` with functional updates where possible.

## External Resources

- [Pragmatic Drag and Drop Documentation](https://atlassian.design/components/pragmatic-drag-and-drop)
- [Closest Edge Reference](https://atlassian.design/components/pragmatic-drag-and-drop/packages/hitbox/closest-edge)
- [Board with Shadows Example](https://atlassian.design/components/pragmatic-drag-and-drop/examples#board-with-shadows)

## Next Steps / TODOs

- Add Section-level tests covering cross-section moves and multi-select drops.
- Document any future custom adapters (calendar, kanban, etc.) under this guide.
- Revisit the manual shadow state once pragmatic exposes built-in drop indicators for virtualized lists.
