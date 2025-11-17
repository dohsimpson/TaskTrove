"use client";

import { atom } from "jotai";
import { type TaskId } from "@tasktrove/types/id";

/**
 * Current drag payload - list of task IDs actively involved in a drag interaction.
 * Allows UI components to maintain drag styling even if they remount (e.g. due to virtualization).
 */
export const draggingTaskIdsAtom = atom<TaskId[]>([]);
draggingTaskIdsAtom.debugLabel = "draggingTaskIdsAtom";

export const dragAtoms = {
  draggingTaskIds: draggingTaskIdsAtom,
} as const;
