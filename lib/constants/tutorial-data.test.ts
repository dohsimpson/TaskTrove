import { describe, it, expect } from "vitest"
import { DataFileSchema } from "@/lib/types"
import tutorialData from "./tutorial-data.json"
import { getLatestAvailableMigration } from "@/lib/utils/data-migration"

describe("Tutorial Data Validation", () => {
  it("should parse tutorial-data.json against DataFileSchema", () => {
    const result = DataFileSchema.safeParse(tutorialData)
    expect(result.success).toBe(true)
  })

  it("should have version matching latest available migration version", () => {
    const latestMigrationVersion = getLatestAvailableMigration()
    expect(tutorialData.version).toBe(latestMigrationVersion)
  })
})
