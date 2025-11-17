#!/usr/bin/env node
import { cpSync, mkdirSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const packageRoot = path.resolve(__dirname, "..")
const repoRoot = path.resolve(packageRoot, "..", "..")

const assets = [
  {
    source: "icons/tasktrove-icon.svg",
    targets: [
      "apps/web/app/icon0.svg",
      "apps/web.pro/app/icon0.svg",
      "apps/import.pro/public/tasktrove-icon.svg",
    ],
  },
  {
    source: "icons/tasktrove-icon.png",
    targets: ["apps/web/app/icon1.png"],
  },
]

let errorCount = 0

for (const asset of assets) {
  const srcPath = path.resolve(packageRoot, asset.source)

  for (const target of asset.targets) {
    const destPath = path.resolve(repoRoot, target)
    try {
      mkdirSync(path.dirname(destPath), { recursive: true })
      cpSync(srcPath, destPath)
      console.log(`Copied ${path.relative(repoRoot, destPath)} <- ${asset.source}`)
    } catch (error) {
      errorCount += 1
      console.error(`Failed to copy ${asset.source} to ${target}:`, error)
    }
  }
}

if (errorCount > 0) {
  console.error(`Branding sync completed with ${errorCount} error(s).`)
  process.exit(1)
}

console.log("Branding sync completed successfully.")
