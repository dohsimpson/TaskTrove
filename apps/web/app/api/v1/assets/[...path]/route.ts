import { NextResponse } from "next/server"
import { readFile, stat } from "fs/promises"
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

/**
 * GET /api/v1/assets/[...path]
 *
 * Serves asset files from the data/assets directory.
 * Supports any file type with appropriate MIME type detection.
 */
async function serveAsset(request: EnhancedRequest, path: string[]) {
  if (path.length === 0) {
    const errorResponse: ErrorResponse = {
      code: ApiErrorCode.INVALID_ASSET_PATH,
      error: "Asset path is required",
      message: "No asset path provided in request",
    }
    return NextResponse.json<ErrorResponse>(errorResponse, { status: 400 })
  }

  // Validate and construct secure file path
  // This prevents path traversal attacks like:
  // - /api/assets/../data.json (access data file)
  // - /api/assets/../../.env (access environment variables)
  // - /api/assets/../../../etc/passwd (access system files)
  const securePath = getSecureAssetPath(path)
  if (!securePath) {
    // Log security attempt with path segments (for security monitoring)
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

/**
 * Creates a middleware-wrapped handler for serving assets.
 *
 * Note: Unlike routes without params (e.g., /api/backup), routes with dynamic
 * segments need a factory function to pass params to the handler. The middleware
 * only accepts single-parameter functions, so we create a closure over the path.
 */
function createAssetHandler(path: string[]) {
  return withApiVersion(
    withAuthentication(
      withApiLogging((request: EnhancedRequest) => serveAsset(request, path), {
        endpoint: API_ROUTES.V1_ASSETS,
        module: "api-v1-assets",
      }),
      { allowApiToken: true },
    ),
  )
}

export async function GET(
  request: EnhancedRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params
  const handler = createAssetHandler(path)
  return handler(request)
}
