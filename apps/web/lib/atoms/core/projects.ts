// Re-export from @tasktrove/atoms package
export * from "@tasktrove/atoms/projects"

// Compatibility exports for existing component imports
import { projectAtoms, projectsAtom } from "@tasktrove/atoms/projects"
export const projectActions = projectAtoms // projectActions → projectAtoms
export const projects = projectsAtom // projects → projectsAtom
