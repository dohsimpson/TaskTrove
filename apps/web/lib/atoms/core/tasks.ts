// Re-export from @tasktrove/atoms package
export * from "@tasktrove/atoms/tasks"

// Compatibility exports for existing component imports
import { taskAtoms, tasksAtom } from "@tasktrove/atoms/tasks"
export const taskActions = taskAtoms // taskActions → taskAtoms
export const tasks = tasksAtom // tasks → tasksAtom
