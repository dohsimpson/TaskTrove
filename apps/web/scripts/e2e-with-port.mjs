#!/usr/bin/env node
import { spawn } from 'node:child_process'
import process from 'node:process'
import { findOpenPort } from './with-port.mjs'

const BASE = Number(process.env.BASE_PORT || 5000)
const MAX_TRIES = Number(process.env.PORT_TRIES || 20)

async function main() {
  const port = await findOpenPort(BASE, MAX_TRIES)
  const extraArgs = process.argv.slice(2)
  const args = ['test', ...extraArgs]
  const bin = process.platform === 'win32' ? 'playwright.cmd' : 'playwright'
  const child = spawn(bin, args, {
    stdio: 'inherit',
    env: { ...process.env, PORT: String(port) },
  })

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal)
    } else {
      process.exit(code ?? 0)
    }
  })

  console.log(`web:e2e → Playwright on http://127.0.0.1:${port}`)
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
