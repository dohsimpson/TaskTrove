/**
 * Tests for origin validation utility
 */

import { describe, it, expect } from "vitest"
import { isValidOrigin } from "./origin-validation"

describe("isValidOrigin", () => {
  it("should allow requests with no origin and no referer", () => {
    expect(isValidOrigin(null, null, "localhost:3000")).toBe(true)
  })

  it("should allow requests with matching origin", () => {
    expect(isValidOrigin("http://localhost:3000", null, "localhost:3000")).toBe(true)
    expect(isValidOrigin("https://example.com", null, "example.com")).toBe(true)
  })

  it("should reject requests with mismatched origin", () => {
    expect(isValidOrigin("https://malicious.com", null, "localhost:3000")).toBe(false)
    expect(isValidOrigin("http://evil.com", null, "example.com")).toBe(false)
  })

  it("should allow requests with matching referer", () => {
    expect(isValidOrigin(null, "http://localhost:3000/page", "localhost:3000")).toBe(true)
    expect(isValidOrigin(null, "https://example.com/some/path", "example.com")).toBe(true)
  })

  it("should reject requests with mismatched referer", () => {
    expect(isValidOrigin(null, "https://malicious.com/page", "localhost:3000")).toBe(false)
    expect(isValidOrigin(null, "http://evil.com/attack", "example.com")).toBe(false)
  })

  it("should handle invalid URLs gracefully", () => {
    expect(isValidOrigin("not-a-url", null, "localhost:3000")).toBe(false)
    expect(isValidOrigin(null, "invalid-referer", "localhost:3000")).toBe(false)
  })

  it("should prioritize origin over referer", () => {
    // Valid origin, invalid referer - should pass
    expect(isValidOrigin("http://localhost:3000", "https://evil.com/page", "localhost:3000")).toBe(
      true,
    )
    // Invalid origin, valid referer - should fail
    expect(isValidOrigin("https://evil.com", "http://localhost:3000/page", "localhost:3000")).toBe(
      false,
    )
  })

  it("should handle port variations correctly", () => {
    expect(isValidOrigin("http://localhost:3000", null, "localhost:3000")).toBe(true)
    expect(isValidOrigin("http://localhost:4000", null, "localhost:3000")).toBe(false)
    expect(isValidOrigin("https://example.com:8443", null, "example.com:8443")).toBe(true)
  })
})
