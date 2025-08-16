import { describe, it, expect } from "vitest"
import { DataFileSchema } from "@/lib/types"
import tutorialData from "./tutorial-data.json"

describe("Tutorial Data Validation", () => {
  it("should parse tutorial-data.json against DataFileSchema", () => {
    const result = DataFileSchema.safeParse(tutorialData)

    if (!result.success) {
      console.error("Validation errors:", result.error.format())
    }

    expect(result.success).toBe(true)
  })
})
