import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from "fs/promises"
import { join } from "path"
import { tmpdir } from "os"
import { ReadableStream } from "node:stream/web"
import { DEFAULT_ASSETS_DIR, DEFAULT_DATA_DIR } from "@tasktrove/constants"

import { GET, POST, PATCH, DELETE } from "./[...path]/route"
import { POST as PUBLIC_POST } from "./public/[...path]/route"
import { DEFAULT_ASSET_ALLOWED_EXTENSIONS, DEFAULT_ASSET_MAX_BYTES } from "./asset-handler"
import { createMockEnhancedRequest } from "@/lib/utils/test-helpers"

describe("API /api/v1/assets/[...path]", () => {
  let tempDir: string
  let assetsDir: string
  let cwdSpy: ReturnType<typeof vi.spyOn>

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "asset-route-"))
    assetsDir = join(tempDir, DEFAULT_DATA_DIR, DEFAULT_ASSETS_DIR)
    await mkdir(assetsDir, { recursive: true })
    cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(tempDir)
  })

  afterEach(async () => {
    cwdSpy.mockRestore()
    await rm(tempDir, { recursive: true, force: true })
  })

  const createByteStream = (totalBytes: number, chunkSize = 1024 * 1024) => {
    let emitted = 0
    return new ReadableStream<Uint8Array>({
      pull(controller) {
        if (emitted >= totalBytes) {
          controller.close()
          return
        }
        const remaining = totalBytes - emitted
        const size = Math.min(chunkSize, remaining)
        controller.enqueue(new Uint8Array(size))
        emitted += size
      },
    })
  }

  it("returns 404 when the path resolves to a directory", async () => {
    const directoryPath = join(assetsDir, "avatar")
    await mkdir(directoryPath, { recursive: true })

    const request = new NextRequest("http://localhost:3000/api/v1/assets/avatar")
    const enhancedRequest = createMockEnhancedRequest(request)
    const response = await GET(enhancedRequest, {
      params: Promise.resolve({ path: ["avatar"] }),
    })

    expect(response.status).toBe(404)

    const body = await response.json()
    expect(body).toEqual({
      code: "ASSET_NOT_FOUND",
      error: "Asset not found",
      message: "Requested asset path is not a file",
    })
  })

  describe("POST /api/v1/assets", () => {
    it("creates a new asset when it does not exist", async () => {
      const filePath = join(assetsDir, "file.png")

      const request = new NextRequest("http://localhost:3000/api/v1/assets/file.png", {
        method: "POST",
        body: Buffer.from("hello"),
      })
      const enhancedRequest = createMockEnhancedRequest(request)
      const response = await POST(enhancedRequest, {
        params: Promise.resolve({ path: ["file.png"] }),
      })

      expect(response.status).toBe(201)

      const body = await response.json()
      expect(body).toEqual({
        message: "Asset created successfully",
        path: "file.png",
      })

      const contents = await readFile(filePath)
      expect(contents.toString()).toBe("hello")
    })

    it("returns 409 when the asset already exists", async () => {
      const filePath = join(assetsDir, "file.png")
      await writeFile(filePath, "existing")

      const request = new NextRequest("http://localhost:3000/api/v1/assets/file.png", {
        method: "POST",
        body: Buffer.from("hello"),
      })
      const enhancedRequest = createMockEnhancedRequest(request)
      const response = await POST(enhancedRequest, {
        params: Promise.resolve({ path: ["file.png"] }),
      })

      expect(response.status).toBe(409)

      const body = await response.json()
      expect(body).toEqual({
        code: "INVALID_ASSET_PATH",
        error: "Asset already exists",
        message: "The requested asset path already exists",
      })
    })

    it("returns 413 when the upload exceeds the max size without content-length", async () => {
      const bodyStream = createByteStream(DEFAULT_ASSET_MAX_BYTES + 1)
      const request = new NextRequest("http://localhost:3000/api/v1/assets/large.png", {
        method: "POST",
        body: bodyStream,
      })
      const enhancedRequest = createMockEnhancedRequest(request)
      const response = await POST(enhancedRequest, {
        params: Promise.resolve({ path: ["large.png"] }),
      })

      expect(response.status).toBe(413)

      const body = await response.json()
      expect(body).toEqual({
        code: "INVALID_REQUEST_BODY",
        error: "Asset too large",
        message: "The uploaded asset exceeds the maximum allowed size",
      })

      await expect(stat(join(assetsDir, "large.png"))).rejects.toMatchObject({
        code: "ENOENT",
      })
    })

    it("returns 413 when content-length exceeds the max size", async () => {
      const request = new NextRequest("http://localhost:3000/api/v1/assets/large.png", {
        method: "POST",
        body: Buffer.from("tiny"),
      })
      const enhancedRequest = createMockEnhancedRequest(request)
      enhancedRequest.headers.set("content-length", String(DEFAULT_ASSET_MAX_BYTES + 1024))
      const response = await POST(enhancedRequest, {
        params: Promise.resolve({ path: ["large.png"] }),
      })

      expect(response.status).toBe(413)

      const body = await response.json()
      expect(body).toEqual({
        code: "INVALID_REQUEST_BODY",
        error: "Asset too large",
        message: "The uploaded asset exceeds the maximum allowed size",
      })

      await expect(stat(join(assetsDir, "large.png"))).rejects.toMatchObject({
        code: "ENOENT",
      })
    })

    it("returns 400 when extension is not allowed", async () => {
      const disallowed = "file.svg"
      const expectedAllowed = [...DEFAULT_ASSET_ALLOWED_EXTENSIONS]
      expect(expectedAllowed).not.toContain("svg")

      const request = new NextRequest(`http://localhost:3000/api/v1/assets/${disallowed}`, {
        method: "POST",
        body: Buffer.from("svg"),
      })
      const enhancedRequest = createMockEnhancedRequest(request)
      const response = await POST(enhancedRequest, {
        params: Promise.resolve({ path: [disallowed] }),
      })

      expect(response.status).toBe(400)

      const body = await response.json()
      expect(body).toEqual({
        code: "INVALID_ASSET_PATH",
        error: "Invalid asset extension",
        message: "The requested asset extension is not allowed",
      })
    })
  })

  describe("PATCH /api/v1/assets", () => {
    it("updates an existing asset", async () => {
      const filePath = join(assetsDir, "file.png")
      await writeFile(filePath, "original")

      const request = new NextRequest("http://localhost:3000/api/v1/assets/file.png", {
        method: "PATCH",
        body: Buffer.from("updated"),
      })
      const enhancedRequest = createMockEnhancedRequest(request)
      const response = await PATCH(enhancedRequest, {
        params: Promise.resolve({ path: ["file.png"] }),
      })

      expect(response.status).toBe(200)

      const body = await response.json()
      expect(body).toEqual({
        message: "Asset updated successfully",
        path: "file.png",
      })

      const contents = await readFile(filePath)
      expect(contents.toString()).toBe("updated")
    })

    it("returns 404 when the asset does not exist", async () => {
      const request = new NextRequest("http://localhost:3000/api/v1/assets/file.png", {
        method: "PATCH",
        body: Buffer.from("updated"),
      })
      const enhancedRequest = createMockEnhancedRequest(request)
      const response = await PATCH(enhancedRequest, {
        params: Promise.resolve({ path: ["file.png"] }),
      })

      expect(response.status).toBe(404)

      const body = await response.json()
      expect(body).toEqual({
        code: "ASSET_NOT_FOUND",
        error: "Asset not found",
        message: "The requested asset file does not exist",
      })
    })

    it("returns 413 when the update exceeds the max size without content-length", async () => {
      const bodyStream = createByteStream(DEFAULT_ASSET_MAX_BYTES + 1)
      const request = new NextRequest("http://localhost:3000/api/v1/assets/large.png", {
        method: "PATCH",
        body: bodyStream,
      })
      const enhancedRequest = createMockEnhancedRequest(request)
      const response = await PATCH(enhancedRequest, {
        params: Promise.resolve({ path: ["large.png"] }),
      })

      expect(response.status).toBe(413)

      const body = await response.json()
      expect(body).toEqual({
        code: "INVALID_REQUEST_BODY",
        error: "Asset too large",
        message: "The uploaded asset exceeds the maximum allowed size",
      })
    })
  })

  describe("DELETE /api/v1/assets", () => {
    it("deletes an existing asset", async () => {
      const filePath = join(assetsDir, "file.png")
      await writeFile(filePath, "delete-me")

      const request = new NextRequest("http://localhost:3000/api/v1/assets/file.png", {
        method: "DELETE",
      })
      const enhancedRequest = createMockEnhancedRequest(request)
      const response = await DELETE(enhancedRequest, {
        params: Promise.resolve({ path: ["file.png"] }),
      })

      expect(response.status).toBe(200)

      const body = await response.json()
      expect(body).toEqual({
        message: "Asset deleted successfully",
        path: "file.png",
      })

      await expect(stat(filePath)).rejects.toMatchObject({ code: "ENOENT" })
    })

    it("returns 404 when the asset does not exist", async () => {
      const request = new NextRequest("http://localhost:3000/api/v1/assets/file.png", {
        method: "DELETE",
      })
      const enhancedRequest = createMockEnhancedRequest(request)
      const response = await DELETE(enhancedRequest, {
        params: Promise.resolve({ path: ["file.png"] }),
      })

      expect(response.status).toBe(404)

      const body = await response.json()
      expect(body).toEqual({
        code: "ASSET_NOT_FOUND",
        error: "Asset not found",
        message: "The requested asset file does not exist",
      })
    })
  })

  describe("POST /api/v1/assets/public", () => {
    it("creates a new asset under the public prefix", async () => {
      const filePath = join(assetsDir, "public", "hero.png")

      const request = new NextRequest("http://localhost:3000/api/v1/assets/public/hero.png", {
        method: "POST",
        body: Buffer.from("hello"),
      })
      const enhancedRequest = createMockEnhancedRequest(request)
      const response = await PUBLIC_POST(enhancedRequest, {
        params: Promise.resolve({ path: ["hero.png"] }),
      })

      expect(response.status).toBe(201)

      const body = await response.json()
      expect(body).toEqual({
        message: "Asset created successfully",
        path: "public/hero.png",
      })

      const contents = await readFile(filePath)
      expect(contents.toString()).toBe("hello")
    })

    it("returns 413 when the public upload exceeds the max size without content-length", async () => {
      const bodyStream = createByteStream(DEFAULT_ASSET_MAX_BYTES + 1)
      const request = new NextRequest("http://localhost:3000/api/v1/assets/public/large.png", {
        method: "POST",
        body: bodyStream,
      })
      const enhancedRequest = createMockEnhancedRequest(request)
      const response = await PUBLIC_POST(enhancedRequest, {
        params: Promise.resolve({ path: ["large.png"] }),
      })

      expect(response.status).toBe(413)

      const body = await response.json()
      expect(body).toEqual({
        code: "INVALID_REQUEST_BODY",
        error: "Asset too large",
        message: "The uploaded asset exceeds the maximum allowed size",
      })

      await expect(stat(join(assetsDir, "public", "large.png"))).rejects.toMatchObject({
        code: "ENOENT",
      })
    })
  })
})
