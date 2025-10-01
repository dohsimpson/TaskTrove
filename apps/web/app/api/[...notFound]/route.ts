import { NextRequest, NextResponse } from "next/server"
import { ApiErrorCode, ErrorResponse } from "@/lib/types"

/**
 * Catch-all route handler for non-existent API endpoints
 * Returns JSON 404 response instead of HTML
 *
 * This route catches all unmatched API requests under /api/*
 */
export async function GET(request: NextRequest) {
  return createNotFoundResponse(request)
}

export async function POST(request: NextRequest) {
  return createNotFoundResponse(request)
}

export async function PUT(request: NextRequest) {
  return createNotFoundResponse(request)
}

export async function PATCH(request: NextRequest) {
  return createNotFoundResponse(request)
}

export async function DELETE(request: NextRequest) {
  return createNotFoundResponse(request)
}

function createNotFoundResponse(request: NextRequest) {
  const errorResponse: ErrorResponse = {
    code: ApiErrorCode.ENDPOINT_NOT_FOUND,
    error: "Not Found",
    message: `API endpoint '${request.nextUrl.pathname}' does not exist`,
  }

  return NextResponse.json<ErrorResponse>(errorResponse, {
    status: 404,
    headers: {
      "Content-Type": "application/json",
    },
  })
}
