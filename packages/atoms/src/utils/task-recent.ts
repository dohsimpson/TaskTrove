import type { Task } from "@tasktrove/types/core";

const toTimestamp = (value: Date | string | undefined): number => {
  if (!value) return Number.NEGATIVE_INFINITY;
  const date = value instanceof Date ? value : new Date(value);
  const time = date.getTime();
  return Number.isFinite(time) ? time : Number.NEGATIVE_INFINITY;
};

export const getTaskRecentActivityTimestamp = (task: Task): number => {
  const createdAt = toTimestamp(task.createdAt);
  const completedAt = toTimestamp(task.completedAt);
  return Math.max(createdAt, completedAt);
};

export const sortTasksByRecentActivity = (tasks: Task[]): Task[] =>
  tasks.sort((a, b) => {
    const delta =
      getTaskRecentActivityTimestamp(b) - getTaskRecentActivityTimestamp(a);
    if (delta !== 0) return delta;
    return toTimestamp(b.createdAt) - toTimestamp(a.createdAt);
  });
