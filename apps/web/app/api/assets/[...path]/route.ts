import { NextRequest, NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { log } from "@/lib/utils/logger"
import { v4 as uuidv4 } from "uuid"
import { getSecureAssetPath } from "@/lib/utils/path-validation"
import { ApiErrorCode, ErrorResponse } from "@/lib/types"
import { auth } from "@/auth"

/**
 * GET /api/assets/[...path]
 *
 * Serves asset files from the data/assets directory.
 * Supports any file type with appropriate MIME type detection.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const requestId = uuidv4()
  const startTime = Date.now()
  const method = request.method || "GET"
  const endpoint = "/api/assets/[...path]"

  // Log request start
  log.info(
    {
      method,
      endpoint,
      requestId,
      module: "api-assets",
    },
    "API request received",
  )

  // Check authentication
  const session = await auth()
  if (!session || !session.user) {
    const errorResponse: ErrorResponse = {
      code: ApiErrorCode.AUTHENTICATION_REQUIRED,
      error: "Authentication required",
      message: "You must be authenticated to access this resource",
    }
    return NextResponse.json<ErrorResponse>(errorResponse, { status: 401 })
  }

  try {
    const { path } = await params

    if (path.length === 0) {
      const duration = Date.now() - startTime
      log.info(
        {
          method,
          endpoint,
          requestId,
          module: "api-assets",
          statusCode: 400,
          responseTime: duration,
        },
        "API request completed with validation error",
      )
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
      const duration = Date.now() - startTime
      // Log security attempt with path segments (for security monitoring)
      log.warn(
        {
          method,
          endpoint,
          requestId,
          module: "api-assets",
          statusCode: 400,
          responseTime: duration,
          pathSegments: path.length, // Don't log actual path to avoid leaking info
          securityEvent: "path-traversal-attempt",
        },
        "API request blocked - invalid asset path detected",
      )
      const errorResponse: ErrorResponse = {
        code: ApiErrorCode.PATH_TRAVERSAL_DETECTED,
        error: "Invalid asset path",
        message: "Path traversal attempt detected",
      }
      return NextResponse.json<ErrorResponse>(errorResponse, { status: 400 })
    }
    const filePath = securePath

    // Read the file
    const fileBuffer = await readFile(filePath)

    // Determine MIME type based on file extension
    const fileName = path[path.length - 1]
    if (!fileName) {
      const duration = Date.now() - startTime
      log.info(
        {
          method,
          endpoint,
          requestId,
          module: "api-assets",
          statusCode: 400,
          responseTime: duration,
        },
        "API request completed with validation error",
      )
      const errorResponse: ErrorResponse = {
        code: ApiErrorCode.INVALID_ASSET_PATH,
        error: "Invalid file name",
        message: "File name could not be determined from path",
      }
      return NextResponse.json<ErrorResponse>(errorResponse, { status: 400 })
    }
    const fileExtension = fileName.split(".").pop()?.toLowerCase()

    let contentType = "application/octet-stream" // Default fallback

    switch (fileExtension) {
      case "jpg":
      case "jpeg":
        contentType = "image/jpeg"
        break
      case "png":
        contentType = "image/png"
        break
      case "gif":
        contentType = "image/gif"
        break
      case "webp":
        contentType = "image/webp"
        break
      case "svg":
        contentType = "image/svg+xml"
        break
      case "pdf":
        contentType = "application/pdf"
        break
      case "txt":
        contentType = "text/plain"
        break
      case "json":
        contentType = "application/json"
        break
      case "csv":
        contentType = "text/csv"
        break
      default:
        contentType = "application/octet-stream"
    }

    const duration = Date.now() - startTime
    log.info(
      {
        method,
        endpoint,
        requestId,
        module: "api-assets",
        statusCode: 200,
        responseTime: duration,
        fileName,
        contentType,
      },
      "API request completed successfully",
    )

    return new Response(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
        "X-Request-ID": requestId,
      },
    })
  } catch (error) {
    const duration = Date.now() - startTime

    // Handle file not found
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      log.info(
        {
          method,
          endpoint,
          requestId,
          module: "api-assets",
          statusCode: 404,
          responseTime: duration,
        },
        "Asset not found",
      )
      const errorResponse: ErrorResponse = {
        code: ApiErrorCode.ASSET_NOT_FOUND,
        error: "Asset not found",
        message: "The requested asset file does not exist",
      }
      return NextResponse.json<ErrorResponse>(errorResponse, { status: 404 })
    }

    // Handle other errors
    log.error(
      {
        method,
        endpoint,
        requestId,
        module: "api-assets",
        responseTime: duration,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        errorType: error instanceof Error ? error.constructor.name : "Unknown",
      },
      "API request failed with error",
    )
    console.error("Error serving asset:", error)
    const errorResponse: ErrorResponse = {
      code: ApiErrorCode.INTERNAL_SERVER_ERROR,
      error: "Internal server error",
      message: error instanceof Error ? error.message : String(error),
    }
    return NextResponse.json<ErrorResponse>(errorResponse, { status: 500 })
  }
}
