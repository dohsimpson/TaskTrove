import { describe, it, expect, beforeEach, vi } from "vitest"
import { NextRequest } from "next/server"
import { GET } from "./route"
import type { Scheduler } from "@tasktrove/scheduler"
import type { SchedulerJob } from "@/lib/types"
import { getScheduler } from "@/lib/scheduler/service"
import { bootstrapScheduler } from "@/lib/scheduler/bootstrap"

vi.mock("@/lib/scheduler/service", () => ({
  getScheduler: vi.fn(),
}))

vi.mock("@/lib/middleware/api-logger", () => ({
  withApiLogging: (handler: (...args: unknown[]) => unknown) => handler,
}))

vi.mock("@/lib/middleware/auth", () => ({
  withAuthentication: (handler: (...args: unknown[]) => unknown) => handler,
}))

vi.mock("@/lib/middleware/api-version", () => ({
  withApiVersion: (handler: (...args: unknown[]) => unknown) => handler,
}))

const mockGetScheduler = vi.mocked(getScheduler)
const mockBootstrapScheduler = vi.mocked(bootstrapScheduler)

describe("GET /api/v1/scheduler/jobs", () => {
  const jobs: SchedulerJob[] = [
    { id: "daily-backup", schedule: { type: "cron", expression: "0 2 * * *" }, autoStart: true },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    mockBootstrapScheduler.mockResolvedValue(undefined)
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    mockGetScheduler.mockReturnValue({
      listJobs: () => jobs,
      isRunning: () => true,
    } as unknown as Scheduler)
  })

  it("returns scheduler jobs", async () => {
    const request = new NextRequest("http://localhost:3000/api/v1/scheduler/jobs", {
      method: "GET",
    })

    const response = await GET(request)
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const body = (await response.json()) as { jobs: SchedulerJob[]; running: boolean }

    expect(response.status).toBe(200)
    expect(body.jobs).toEqual(jobs)
    expect(body.running).toBe(true)
    expect(mockBootstrapScheduler).toHaveBeenCalledTimes(1)
  })

  it("sets no-cache headers", async () => {
    const request = new NextRequest("http://localhost:3000/api/v1/scheduler/jobs", {
      method: "GET",
    })

    const response = await GET(request)

    expect(response.headers.get("Cache-Control")).toBe("no-cache, no-store, must-revalidate")
    expect(response.headers.get("Pragma")).toBe("no-cache")
    expect(response.headers.get("Expires")).toBe("0")
  })
})
vi.mock("@/lib/scheduler/bootstrap", () => ({
  bootstrapScheduler: vi.fn().mockResolvedValue(undefined),
}))
