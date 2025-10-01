import { describe, it, expect } from "vitest"
import { NextRequest } from "next/server"
import { GET, POST, PATCH, DELETE } from "./route"
import { ApiErrorCode } from "@/lib/types"

describe("API 404 Catch-All Handler", () => {
  const createRequest = (path: string, method: string) => {
    return new NextRequest(new URL(`http://localhost:3000${path}`), {
      method,
    })
  }

  it("should return JSON 404 for non-existent GET endpoints", async () => {
    const request = createRequest("/api/nonexistent", "GET")
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(response.headers.get("Content-Type")).toContain("application/json")
    expect(data.code).toBe(ApiErrorCode.ENDPOINT_NOT_FOUND)
    expect(data.error).toBe("Not Found")
    expect(data.message).toContain("/api/nonexistent")
  })

  it("should return JSON 404 for non-existent POST endpoints", async () => {
    const request = createRequest("/api/v1/nonexistent", "POST")
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.code).toBe(ApiErrorCode.ENDPOINT_NOT_FOUND)
    expect(data.message).toContain("/api/v1/nonexistent")
  })

  it("should return JSON 404 for non-existent PATCH endpoints", async () => {
    const request = createRequest("/api/fake/endpoint", "PATCH")
    const response = await PATCH(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.code).toBe(ApiErrorCode.ENDPOINT_NOT_FOUND)
  })

  it("should return JSON 404 for non-existent DELETE endpoints", async () => {
    const request = createRequest("/api/does-not-exist", "DELETE")
    const response = await DELETE(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.code).toBe(ApiErrorCode.ENDPOINT_NOT_FOUND)
  })

  it("should include the full path in the error message", async () => {
    const path = "/api/v1/some/deeply/nested/path"
    const request = createRequest(path, "GET")
    const response = await GET(request)
    const data = await response.json()

    expect(data.message).toContain(path)
  })

  it("should return proper error response structure", async () => {
    const request = createRequest("/api/test", "GET")
    const response = await GET(request)
    const data = await response.json()

    expect(data).toHaveProperty("code")
    expect(data).toHaveProperty("error")
    expect(data).toHaveProperty("message")
    expect(typeof data.code).toBe("string")
    expect(typeof data.error).toBe("string")
    expect(typeof data.message).toBe("string")
  })
})
