import net from 'node:net'

export function isPortFree(port) {
  return new Promise((resolve) => {
    const srv = net.createServer()
    srv.unref()
    srv.on('error', () => resolve(false))
    srv.listen({ port }, () => {
      srv.close(() => resolve(true))
    })
  })
}

export async function findOpenPort(start, tries) {
  for (let p = start, end = start + tries; p < end; p++) {
    if (await isPortFree(p)) return p
  }
  throw new Error(`No free port in range ${start}-${start + tries - 1}`)
}
