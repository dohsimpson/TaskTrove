import type { MetadataRoute } from "next"
import { THEME_COLORS } from "@tasktrove/constants"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TaskTrove",
    short_name: "TaskTrove",
    description: "Task management application",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: THEME_COLORS.pwaBackground,
    theme_color: THEME_COLORS.pwaTheme,
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
