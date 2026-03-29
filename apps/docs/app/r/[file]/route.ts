import {
  getRegistryIndex,
  getRegistryItem,
  resolveRegistryFileRequest,
} from "../../../lib/registry"

export const runtime = "nodejs"

export async function GET(
  _request: Request,
  context: {
    params: Promise<{
      file: string
    }>
  },
) {
  const { file } = await context.params
  const resolvedRequest = resolveRegistryFileRequest(file)

  if (!resolvedRequest) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  if (resolvedRequest.kind === "index") {
    return Response.json({
      items: getRegistryIndex(),
    })
  }

  const item = getRegistryItem(resolvedRequest.name)

  if (!item) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  return Response.json(item)
}
