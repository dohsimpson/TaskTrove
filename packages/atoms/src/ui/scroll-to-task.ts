import { atom } from "jotai";
import type { TaskId } from "@tasktrove/types/id";

/**
 * Global atom to trigger scrolling to a specific task in the virtual list
 * When set, the VirtualizedTaskList component will scroll to the specified task
 * and highlight it briefly.
 */
export const scrollToTaskAtom = atom<TaskId | null>(null);

/**
 * Action atom to trigger scrolling to a task
 * Usage: const scrollToTask = useSetAtom(scrollToTaskActionAtom)
 * scrollToTask(taskId)
 */
export const scrollToTaskActionAtom = atom(
  null,
  (get, set, taskId: TaskId | null) => {
    set(scrollToTaskAtom, taskId);
  },
);
