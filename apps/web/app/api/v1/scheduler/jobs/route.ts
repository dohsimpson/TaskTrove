import { NextResponse } from "next/server"
import { withApiLogging } from "@/lib/middleware/api-logger"
import { withAuthentication } from "@/lib/middleware/auth"
import { withApiVersion } from "@/lib/middleware/api-version"
import type { GetSchedulerJobsResponse } from "@tasktrove/types/api-responses"
import { bootstrapScheduler } from "@/lib/scheduler/bootstrap"
import { getScheduler } from "@/lib/scheduler/service"

async function listSchedulerJobs(): Promise<NextResponse<GetSchedulerJobsResponse>> {
  await bootstrapScheduler()
  const scheduler = getScheduler()
  const jobs = scheduler.listJobs()

  const response: GetSchedulerJobsResponse = {
    jobs,
    running: scheduler.isRunning(),
  }

  return NextResponse.json(response, {
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  })
}

export const GET = withApiVersion(
  withAuthentication(
    withApiLogging(listSchedulerJobs, {
      endpoint: "/api/v1/scheduler/jobs",
      module: "api-v1-scheduler",
    }),
    { allowApiToken: true },
  ),
)
