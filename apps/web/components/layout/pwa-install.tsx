"use client"

// Import the PWA install component to ensure it's loaded
import "@khmyznikov/pwa-install"

export function PwaInstall() {
  return (
    <>
      {/* @ts-expect-error - web component */}
      <pwa-install manifest-url="/manifest.webmanifest" use-local-storage="true">
        {/* @ts-expect-error - web component */}
      </pwa-install>
    </>
  )
}
