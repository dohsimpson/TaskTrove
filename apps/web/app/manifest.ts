import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TaskTrove",
    short_name: "TaskTrove",
    description: "Task management application",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#1b1b1b",
    theme_color: "#1b1b1b",
    icons: [
      {
        src: "/web-app-manifest-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/web-app-manifest-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  }
}
