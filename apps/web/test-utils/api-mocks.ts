/**
 * API testing utility functions
 */

/**
 * Creates a mock enhanced request for testing
 * @param request Base request-like object
 * @param context Mock context properties
 * @returns Enhanced request with mock context
 */
export function createMockEnhancedRequest<
  TRequest extends object,
  TContext extends Record<string, unknown>,
>(request: TRequest, context: TContext): TRequest & { context: TContext } {
  return {
    ...request,
    context,
  }
}

/**
 * Creates a mock atom value for testing
 * @param value The value to mock
 * @returns Mock atom object
 */
export function createMockAtomValue<T>(value: T): {
  init: T
  read: () => T
  write: () => void
  toString: () => string
} {
  return {
    init: value,
    read: () => value,
    write: () => {},
    toString: () => `atom(${JSON.stringify(value)})`,
  }
}
