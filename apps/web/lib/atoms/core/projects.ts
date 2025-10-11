// Re-export from @tasktrove/atoms package
export * from "@tasktrove/atoms"

// Compatibility exports for existing component imports
import { projectAtoms, projectsAtom } from "@tasktrove/atoms"
export const projectActions = projectAtoms // projectActions → projectAtoms
export const projects = projectsAtom // projects → projectsAtom
