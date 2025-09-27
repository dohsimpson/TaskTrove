import { NextRequest, NextResponse } from "next/server"
import { checkDataFile } from "@/lib/startup-checks"
import { isValidOrigin } from "@/lib/utils/origin-validation"
import { withMutexProtection } from "@/lib/utils/api-mutex"
import { writeInitialDataFile } from "@/lib/utils/data-initialization"

async function initializeData(request: NextRequest) {
  // Validate origin first
  const origin = request.headers.get("origin")
  const referer = request.headers.get("referer")
  const host = request.headers.get("host")

  if (!isValidOrigin(origin, referer, host)) {
    return NextResponse.json(
      {
        status: "error",
        message: "Forbidden: Invalid request origin",
        timestamp: new Date().toISOString(),
      },
      { status: 403 },
    )
  }
  try {
    // Check if data file already exists
    const dataFileCheck = await checkDataFile()

    if (dataFileCheck.exists) {
      return NextResponse.json(
        {
          status: "error",
          message: "Data file already exists",
          details: "Data file initialization is only allowed when no existing data file is present",
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      )
    }

    // Initialize with tutorial data
    await writeInitialDataFile()

    return NextResponse.json({
      status: "success",
      message: "Data file initialized successfully",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const errorMessage = `Failed to initialize data file: ${error instanceof Error ? error.message : String(error)}`
    console.error(errorMessage)

    return NextResponse.json(
      {
        status: "error",
        message: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

export const POST = withMutexProtection(initializeData)
