import { describe, it, expect } from "vitest"
import { DataFileSchema } from "@/lib/types"
import tutorialData from "./tutorial-data.json"
import packageJson from "../../package.json"

describe("Tutorial Data Validation", () => {
  it("should parse tutorial-data.json against DataFileSchema", () => {
    const result = DataFileSchema.safeParse(tutorialData)
    expect(result.success).toBe(true)
  })

  it("should have version matching package.json version", () => {
    expect(tutorialData.version).toBe(`v${packageJson.version}`)
  })
})
