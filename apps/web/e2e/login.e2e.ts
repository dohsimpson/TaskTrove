import { test, expect } from "@playwright/test"
import fs from "fs/promises"
import path from "path"

const dataFilePath = path.resolve("data/data.json")
const tutorialDataPath = path.resolve("lib/constants/tutorial-data.json")
const backupPath = path.resolve("data/data.json.e2e-backup")

const password = "TestPassword123!"

async function fileExists(filePath: string) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

test.beforeAll(async () => {
  if (await fileExists(dataFilePath)) {
    await fs.copyFile(dataFilePath, backupPath)
  }
})

test.beforeEach(async () => {
  const tutorialData = await fs.readFile(tutorialDataPath, "utf-8")
  await fs.mkdir(path.dirname(dataFilePath), { recursive: true })
  await fs.writeFile(dataFilePath, tutorialData)
})

test.afterAll(async () => {
  if (await fileExists(backupPath)) {
    await fs.copyFile(backupPath, dataFilePath)
    await fs.unlink(backupPath)
  }
})

test("login flow sets password and signs in", async ({ page }) => {
  await page.goto("/signin")

  await page.getByPlaceholder("Create Password").fill(password)
  await page.getByPlaceholder("Confirm Password").fill(password)
  await page.getByRole("button", { name: "Initialize" }).click()

  await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible()
  await page.getByLabel("Password").fill(password)
  const signInResponsePromise = page.waitForResponse((response) =>
    response.url().includes("/api/auth/callback/credentials"),
  )
  await page.getByRole("button", { name: "Sign In" }).click()
  const signInResponse = await signInResponsePromise
  await signInResponse.text()

  await expect(page).not.toHaveURL(/\/signin$/)
  const sessionResponse = await page.request.get("/api/auth/session")
  const sessionBody = await sessionResponse.json()
  expect(sessionBody?.user?.name).toBe("admin")
})
