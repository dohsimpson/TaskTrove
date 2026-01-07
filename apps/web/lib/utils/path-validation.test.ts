import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { realpathSync } from "fs"
import { mkdtemp, mkdir, rm, symlink, writeFile } from "fs/promises"
import { tmpdir } from "os"
import { join, resolve } from "path"

import { getSecureAssetPath } from "./path-validation"

describe("getSecureAssetPath", () => {
  let tempDir: string
  let cwdSpy: ReturnType<typeof vi.spyOn>

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "asset-path-"))
    await mkdir(join(tempDir, "data", "assets"), { recursive: true })
    cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(tempDir)
  })

  afterEach(async () => {
    cwdSpy.mockRestore()
    await rm(tempDir, { recursive: true, force: true })
  })

  it("rejects symlink files inside the assets directory", async () => {
    const outsideDir = join(tempDir, "outside")
    await mkdir(outsideDir, { recursive: true })
    const outsideFile = join(outsideDir, "secret.txt")
    await writeFile(outsideFile, "nope")

    const linkPath = join(tempDir, "data", "assets", "link.txt")
    await symlink(outsideFile, linkPath)

    expect(getSecureAssetPath(["link.txt"])).toBeNull()
  })

  it("rejects symlink directories inside the assets directory", async () => {
    const outsideDir = join(tempDir, "outside-dir")
    await mkdir(outsideDir, { recursive: true })
    const outsideFile = join(outsideDir, "secret.txt")
    await writeFile(outsideFile, "nope")

    const linkDir = join(tempDir, "data", "assets", "linked")
    await symlink(outsideDir, linkDir)

    expect(getSecureAssetPath(["linked", "secret.txt"])).toBeNull()
  })

  it("returns the resolved path for normal files", async () => {
    const assetFile = join(tempDir, "data", "assets", "ok.txt")
    await writeFile(assetFile, "ok")

    expect(getSecureAssetPath(["ok.txt"])).toBe(resolve(realpathSync(assetFile)))
  })
})
