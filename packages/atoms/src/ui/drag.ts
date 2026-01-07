"use client";

import { atom } from "jotai";
import { type TaskId } from "@tasktrove/types/id";

/**
 * Current drag payload - list of task IDs actively involved in a drag interaction.
 * Allows UI components to maintain drag styling even if they remount (e.g. due to virtualization).
 */
export const draggingTaskIdsAtom = atom<TaskId[]>([]);
draggingTaskIdsAtom.debugLabel = "draggingTaskIdsAtom";

export const resizingTaskIdAtom = atom<TaskId | null>(null);
resizingTaskIdAtom.debugLabel = "resizingTaskIdAtom";

/**
 * External calendar event being dragged (Pro-only).
 * Events don't support multi-select, so we track a single ID.
 */
export const draggingEventIdAtom = atom<string | null>(null);
draggingEventIdAtom.debugLabel = "draggingEventIdAtom";

/**
 * External calendar event being resized (Pro-only).
 */
export const resizingEventIdAtom = atom<string | null>(null);
resizingEventIdAtom.debugLabel = "resizingEventIdAtom";

/**
 * Derived: is ANY item (task or event) being dragged?
 */
export const isAnyDragActiveAtom = atom((get) => {
  const taskIds = get(draggingTaskIdsAtom);
  const eventId = get(draggingEventIdAtom);
  return taskIds.length > 0 || eventId !== null;
});
isAnyDragActiveAtom.debugLabel = "isAnyDragActiveAtom";

/**
 * Derived: is ANY item (task or event) being resized?
 */
export const isAnyResizeActiveAtom = atom((get) => {
  const taskId = get(resizingTaskIdAtom);
  const eventId = get(resizingEventIdAtom);
  return taskId !== null || eventId !== null;
});
isAnyResizeActiveAtom.debugLabel = "isAnyResizeActiveAtom";

export const dragAtoms = {
  draggingTaskIds: draggingTaskIdsAtom,
  resizingTaskId: resizingTaskIdAtom,
  draggingEventId: draggingEventIdAtom,
  resizingEventId: resizingEventIdAtom,
  isAnyDragActive: isAnyDragActiveAtom,
  isAnyResizeActive: isAnyResizeActiveAtom,
} as const;
