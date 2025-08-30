import { NextResponse } from "next/server"
import { runBackup } from "@/lib/backup"

export async function POST() {
  try {
    console.log("Manual backup triggered via API...")
    await runBackup()

    return NextResponse.json({
      success: true,
      message: "Backup completed successfully",
    })
  } catch (error) {
    console.error("Manual backup failed:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Backup failed",
      },
      { status: 500 },
    )
  }
}
