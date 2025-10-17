/**
 * Shared drag-and-drop components built on Atlaskit's Pragmatic Drag and Drop.
 *
 * These components provide a consistent, reusable foundation for drag-and-drop
 * interactions across the application.
 *
 * Architecture:
 * - DraggableItem: Generic draggable wrapper (list/tree modes)
 * - DropTargetItem: Generic drop target wrapper (list-item/group/tree-item modes)
 *
 * Usage:
 * - Tasks: Use list mode for vertical task lists
 * - Sections: Use list-item + group modes for sections and task reordering
 * - Sidebar: Use tree mode for hierarchical project/group navigation
 */

export { DraggableItem } from "./draggable-item"
export { DropTargetItem } from "./drop-target-item"
export type { DraggableMode } from "./draggable-item"
export type { DropTargetMode, Instruction } from "./drop-target-item"
