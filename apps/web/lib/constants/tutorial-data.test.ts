import { describe, it, expect } from "vitest"
import type { DataFile } from "@tasktrove/types/data-file"
import type { Json } from "@tasktrove/types/constants"
import { DataFileSchema } from "@tasktrove/types/data-file"
import { getLatestAvailableMigration } from "@/lib/utils/data-migration"
import tutorialData from "@/lib/constants/tutorial-data.json"

export function runTutorialDataTests(data: Json) {
  describe("Tutorial Data Validation", () => {
    it("should parse tutorial-data.json against DataFileSchema", () => {
      const result = DataFileSchema.safeParse(data)
      if (!result.success) {
        console.error("Validation errors:", JSON.stringify(result.error.issues, null, 2))
      }
      expect(result.success).toBe(true)
    })

    it("should have version matching latest available migration version", () => {
      const latestMigrationVersion = getLatestAvailableMigration()
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const dataFile = data as unknown as DataFile
      const version = dataFile.version
      expect(version).toBe(latestMigrationVersion)
    })
  })
}

runTutorialDataTests(tutorialData)
