import type { EnhancedRequest } from "@/lib/middleware/api-logger"
import {
  DEFAULT_ASSET_ALLOWED_EXTENSIONS,
  DEFAULT_ASSET_MAX_BYTES,
  createAssetHandler,
  createAssetMutationHandler,
} from "@/app/api/v1/assets/asset-handler"

export async function GET(
  request: EnhancedRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params
  const handler = createAssetHandler(path, { requireAuth: true })
  return handler(request)
}

export async function POST(
  request: EnhancedRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params
  const handler = createAssetMutationHandler(path, "create", {
    requireAuth: true,
    allowedExtensions: [...DEFAULT_ASSET_ALLOWED_EXTENSIONS],
    maxBytes: DEFAULT_ASSET_MAX_BYTES,
  })
  return handler(request)
}

export async function PATCH(
  request: EnhancedRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params
  const handler = createAssetMutationHandler(path, "update", {
    requireAuth: true,
    allowedExtensions: [...DEFAULT_ASSET_ALLOWED_EXTENSIONS],
    maxBytes: DEFAULT_ASSET_MAX_BYTES,
  })
  return handler(request)
}

export async function DELETE(
  request: EnhancedRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params
  const handler = createAssetMutationHandler(path, "delete", { requireAuth: true })
  return handler(request)
}
