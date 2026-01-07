import { NextResponse } from "next/server"
import { readFile, stat, writeFile, mkdir, unlink } from "fs/promises"
import { dirname } from "path"
import { getSecureAssetPath } from "@/lib/utils/path-validation"
import { ApiErrorCode } from "@tasktrove/types/api-errors"
import type { ErrorResponse } from "@tasktrove/types/api-responses"
import { API_ROUTES } from "@tasktrove/types/constants"
import { withAuthentication } from "@/lib/middleware/auth"
import { withApiVersion } from "@/lib/middleware/api-version"
import { withApiLogging, type EnhancedRequest, logSecurityEvent } from "@/lib/middleware/api-logger"

/**
 * MIME type mapping for common file extensions
 */
const MIME_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  pdf: "application/pdf",
  txt: "text/plain",
  json: "application/json",
  csv: "text/csv",
}

type AssetMutationMode = "create" | "update" | "delete"
type AssetMutationOptions = {
  requireAuth?: boolean
  allowedExtensions?: string[]
  maxBytes?: number
}

export const DEFAULT_ASSET_ALLOWED_EXTENSIONS = ["webp", "gif", "png", "jpg", "jpeg"] as const
export const DEFAULT_ASSET_MAX_BYTES = 10 * 1024 * 1024

function createAssetTooLargeResponse() {
  const errorResponse: ErrorResponse = {
    code: ApiErrorCode.INVALID_REQUEST_BODY,
    error: "Asset too large",
    message: "The uploaded asset exceeds the maximum allowed size",
  }
  return NextResponse.json<ErrorResponse>(errorResponse, { status: 413 })
}

function createMissingPathResponse() {
  const errorResponse: ErrorResponse = {
    code: ApiErrorCode.INVALID_ASSET_PATH,
    error: "Asset path is required",
    message: "No asset path provided in request",
  }
  return NextResponse.json<ErrorResponse>(errorResponse, { status: 400 })
}

function createInvalidPathResponse(request: EnhancedRequest, path: string[]) {
  logSecurityEvent(
    "path-traversal-attempt",
    "medium",
    {
      pathSegments: path.length, // Don't log actual path to avoid leaking info
    },
    request.context,
  )
  const errorResponse: ErrorResponse = {
    code: ApiErrorCode.PATH_TRAVERSAL_DETECTED,
    error: "Invalid asset path",
    message: "Path traversal attempt detected",
  }
  return NextResponse.json<ErrorResponse>(errorResponse, { status: 400 })
}

function createAssetNotFoundResponse() {
  const errorResponse: ErrorResponse = {
    code: ApiErrorCode.ASSET_NOT_FOUND,
    error: "Asset not found",
    message: "The requested asset file does not exist",
  }
  return NextResponse.json<ErrorResponse>(errorResponse, { status: 404 })
}

function createInvalidRequestBodyResponse() {
  const errorResponse: ErrorResponse = {
    code: ApiErrorCode.INVALID_REQUEST_BODY,
    error: "Invalid request body",
    message: "The request body could not be read",
  }
  return NextResponse.json<ErrorResponse>(errorResponse, { status: 400 })
}

function getValidatedAssetPath(
  request: EnhancedRequest,
  path: string[],
): { securePath: string } | { response: NextResponse<ErrorResponse> } {
  if (path.length === 0) {
    return { response: createMissingPathResponse() }
  }

  const securePath = getSecureAssetPath(path)
  if (!securePath) {
    return { response: createInvalidPathResponse(request, path) }
  }

  return { securePath }
}

async function getExistingStats(securePath: string) {
  try {
    return await stat(securePath)
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return null
    }
    throw error
  }
}

/**
 * Serves asset files from the data/assets directory.
 * Supports any file type with appropriate MIME type detection.
 */
export async function serveAsset(request: EnhancedRequest, path: string[]) {
  const validationResult = getValidatedAssetPath(request, path)
  if ("response" in validationResult) {
    return validationResult.response
  }
  const { securePath } = validationResult

  try {
    const fileStats = await stat(securePath)
    if (!fileStats.isFile()) {
      const errorResponse: ErrorResponse = {
        code: ApiErrorCode.ASSET_NOT_FOUND,
        error: "Asset not found",
        message: "Requested asset path is not a file",
      }
      return NextResponse.json<ErrorResponse>(errorResponse, { status: 404 })
    }

    // Read the file
    const fileBuffer = await readFile(securePath)

    // Determine MIME type based on file extension
    const fileName = path[path.length - 1]
    if (!fileName) {
      const errorResponse: ErrorResponse = {
        code: ApiErrorCode.INVALID_ASSET_PATH,
        error: "Invalid file name",
        message: "File name could not be determined from path",
      }
      return NextResponse.json<ErrorResponse>(errorResponse, { status: 400 })
    }

    const fileExtension = fileName.split(".").pop()?.toLowerCase()
    const contentType = fileExtension
      ? (MIME_TYPES[fileExtension] ?? "application/octet-stream")
      : "application/octet-stream"

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      },
    })
  } catch (error) {
    // Handle file not found
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      const errorResponse: ErrorResponse = {
        code: ApiErrorCode.ASSET_NOT_FOUND,
        error: "Asset not found",
        message: "The requested asset file does not exist",
      }
      return NextResponse.json<ErrorResponse>(errorResponse, { status: 404 })
    }

    // Re-throw other errors to let middleware handle logging
    throw error
  }
}

async function mutateAsset(
  request: EnhancedRequest,
  path: string[],
  mode: AssetMutationMode,
  options?: Pick<AssetMutationOptions, "allowedExtensions" | "maxBytes">,
) {
  const validationResult = getValidatedAssetPath(request, path)
  if ("response" in validationResult) {
    return validationResult.response
  }
  const { securePath } = validationResult

  if (options?.allowedExtensions?.length) {
    const fileName = path[path.length - 1]
    const fileExtension = fileName?.split(".").pop()?.toLowerCase()
    if (!fileExtension || !options.allowedExtensions.includes(fileExtension)) {
      const errorResponse: ErrorResponse = {
        code: ApiErrorCode.INVALID_ASSET_PATH,
        error: "Invalid asset extension",
        message: "The requested asset extension is not allowed",
      }
      return NextResponse.json<ErrorResponse>(errorResponse, { status: 400 })
    }
  }

  if (mode === "delete") {
    const fileStats = await getExistingStats(securePath)
    if (!fileStats || !fileStats.isFile()) {
      return createAssetNotFoundResponse()
    }

    await unlink(securePath)

    return NextResponse.json(
      {
        message: "Asset deleted successfully",
        path: path.join("/"),
      },
      { status: 200 },
    )
  }

  const maxBytes = options?.maxBytes
  if (maxBytes) {
    const contentLength = request.headers.get("content-length")
    const parsedLength = contentLength ? Number(contentLength) : NaN
    if (Number.isFinite(parsedLength) && parsedLength > maxBytes) {
      return createAssetTooLargeResponse()
    }
  }

  let fileBuffer: Buffer
  if (maxBytes) {
    const reader = request.body?.getReader()
    if (!reader) {
      return createInvalidRequestBodyResponse()
    }

    const chunks: Uint8Array[] = []
    let totalLength = 0

    for (;;) {
      const result = await reader.read()
      if (result.done) break
      const value = result.value
      const nextLength = totalLength + value.byteLength
      if (nextLength > maxBytes) {
        await reader.cancel()
        return createAssetTooLargeResponse()
      }
      totalLength = nextLength
      chunks.push(value)
    }

    fileBuffer = Buffer.concat(chunks, totalLength)
  } else {
    fileBuffer = Buffer.from(await request.arrayBuffer())
  }
  const fileStats = await getExistingStats(securePath)

  if (mode === "create") {
    if (fileStats) {
      const errorResponse: ErrorResponse = {
        code: ApiErrorCode.INVALID_ASSET_PATH,
        error: "Asset already exists",
        message: "The requested asset path already exists",
      }
      return NextResponse.json<ErrorResponse>(errorResponse, { status: 409 })
    }

    await mkdir(dirname(securePath), { recursive: true })
    await writeFile(securePath, fileBuffer)

    return NextResponse.json(
      {
        message: "Asset created successfully",
        path: path.join("/"),
      },
      { status: 201 },
    )
  }

  if (!fileStats || !fileStats.isFile()) {
    return createAssetNotFoundResponse()
  }

  await writeFile(securePath, fileBuffer)

  return NextResponse.json(
    {
      message: "Asset updated successfully",
      path: path.join("/"),
    },
    { status: 200 },
  )
}

/**
 * Creates a middleware-wrapped handler for serving assets.
 *
 * Note: Unlike routes without params (e.g., /api/backup), routes with dynamic
 * segments need a factory function to pass params to the handler. The middleware
 * only accepts single-parameter functions, so we create a closure over the path.
 */
export function createAssetHandler(
  path: string[],
  options?: {
    requireAuth?: boolean
  },
) {
  const handler = withApiLogging((request: EnhancedRequest) => serveAsset(request, path), {
    endpoint: API_ROUTES.V1_ASSETS,
    module: "api-v1-assets",
  })

  const requireAuth = options?.requireAuth ?? true

  return withApiVersion(
    requireAuth ? withAuthentication(handler, { allowApiToken: true }) : handler,
  )
}

export function createAssetMutationHandler(
  path: string[],
  mode: AssetMutationMode,
  options?: AssetMutationOptions,
) {
  const handler = withApiLogging(
    (request: EnhancedRequest) => mutateAsset(request, path, mode, options),
    {
      endpoint: API_ROUTES.V1_ASSETS,
      module: "api-v1-assets",
    },
  )

  const requireAuth = options?.requireAuth ?? true

  return withApiVersion(
    requireAuth ? withAuthentication(handler, { allowApiToken: true }) : handler,
  )
}
