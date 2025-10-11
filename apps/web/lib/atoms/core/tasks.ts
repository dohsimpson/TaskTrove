// Re-export from @tasktrove/atoms package
export * from "@tasktrove/atoms"

// Compatibility exports for existing component imports
import { taskAtoms, tasksAtom } from "@tasktrove/atoms"
export const taskActions = taskAtoms // taskActions → taskAtoms
export const tasks = tasksAtom // tasks → tasksAtom
