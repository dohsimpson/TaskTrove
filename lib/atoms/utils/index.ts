import { atom, Atom, WritableAtom } from "jotai"
import { atomWithStorage } from "jotai/utils"
import { log } from "@/lib/utils/logger"

// Storage key prefix for the app
export const STORAGE_PREFIX = "tasktrove-"

/**
 * Creates an atom with localStorage persistence
 * @param key - Storage key (will be prefixed with STORAGE_PREFIX)
 * @param initialValue - Initial value for the atom
 * @param options - Additional options for storage
 */
export function createAtomWithStorage<T>(
  key: string,
  initialValue: T,
  options?: {
    getOnInit?: boolean
    serialize?: (value: T) => string
    deserialize?: (value: string) => T
  },
) {
  // Use default localStorage for Jotai, but wrap in SSR check
  if (typeof window === "undefined") {
    // Return a simple atom for SSR
    return atom(initialValue)
  }

  return atomWithStorage(
    `${STORAGE_PREFIX}${key}`,
    initialValue,
    undefined, // Use default localStorage
    options,
  )
}

/**
 * Creates a derived atom that handles async operations with error states
 * @param baseAtom - The base atom to derive from
 * @param asyncFn - Async function to apply
 */
export function createAsyncAtom<T, R>(baseAtom: Atom<T>, asyncFn: (value: T) => Promise<R>) {
  return atom(async (get) => {
    try {
      const baseValue = get(baseAtom)
      return await asyncFn(baseValue)
    } catch (error) {
      log.error({ error, module: "utils" }, "Async atom error")
      throw error
    }
  })
}

/**
 * Error handling utility for atoms
 * @param error - Error to handle
 * @param context - Context where the error occurred
 */
export function handleAtomError(error: unknown, context: string) {
  log.error({ error, context, module: "utils" }, `Atom error in ${context}`)

  // In development, we might want to show more detailed errors
  if (process.env.NODE_ENV === "development") {
    log.debug({ error, context, module: "utils" }, "Error stack trace")
  }

  // Return a user-friendly error message
  if (error instanceof Error) {
    return error.message
  }

  return "An unexpected error occurred"
}

/**
 * Creates a computed atom that safely handles potential errors
 * @param derivedAtom - Atom to wrap with error handling
 * @param defaultValue - Default value to return on error
 * @param errorContext - Context for error logging
 */
export function createSafeAtom<T>(derivedAtom: Atom<T>, defaultValue: T, errorContext: string) {
  return atom((get) => {
    try {
      return get(derivedAtom)
    } catch (error) {
      handleAtomError(error, errorContext)
      return defaultValue
    }
  })
}

/**
 * Creates an atom that debounces updates
 * @param baseAtom - The base atom to debounce
 * @param delay - Debounce delay in milliseconds
 */
export function createDebouncedAtom<T>(
  baseAtom: WritableAtom<T, [T], unknown>,
  delay: number = 300,
) {
  let timeoutId: NodeJS.Timeout | null = null

  return atom(
    (get) => get(baseAtom),
    (get, set, update: T) => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      timeoutId = setTimeout(() => {
        set(baseAtom, update)
        timeoutId = null
      }, delay)
    },
  )
}

/**
 * Type helper for atom setters
 */
export type AtomSetter<T> = (update: T | ((prev: T) => T)) => void

/**
 * Type helper for atom getters
 */
export type AtomGetter = <T>(atomValue: Atom<T>) => T
