import { NextRequest, NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { join } from "path"
import { DEFAULT_ASSETS_DIR, DEFAULT_DATA_DIR } from "@tasktrove/constants"

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
  try {
    const { path } = await params

    if (!path || path.length === 0) {
      return NextResponse.json({ error: "Asset path is required" }, { status: 400 })
    }

    // Construct the file path
    const filePath = join(process.cwd(), DEFAULT_DATA_DIR, DEFAULT_ASSETS_DIR, ...path)

    // Read the file
    const fileBuffer = await readFile(filePath)

    // Determine MIME type based on file extension
    const fileName = path[path.length - 1]
    if (!fileName) {
      return NextResponse.json({ error: "Invalid file name" }, { status: 400 })
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

    return new Response(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      },
    })
  } catch (error) {
    // Handle file not found
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    }

    // Handle other errors
    console.error("Error serving asset:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
