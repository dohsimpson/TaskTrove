/**
 * API testing utility functions
 */

/**
 * Creates a mock enhanced request for testing
 * @param request Base NextRequest object
 * @param context Mock context properties
 * @returns Enhanced request with mock context
 */
export function createMockEnhancedRequest<T extends Record<string, any>>(
  request: any,
  context: T,
): any {
  // Create a copy of the request with the context added
  const enhancedRequest = Object.create(Object.getPrototypeOf(request))
  Object.assign(enhancedRequest, request)
  enhancedRequest.context = context
  return enhancedRequest
}

/**
 * Creates a mock atom value for testing
 * @param value The value to mock
 * @returns Mock atom object
 */
export function createMockAtomValue<T>(value: T): any {
  return {
    init: value,
    read: () => value,
    write: () => {},
    toString: () => `atom(${JSON.stringify(value)})`,
  }
}
