import {
  getDefaultRegistryNamespace,
  getRegistryTemplate,
} from "../config/index.js"
import type { LoomConfig } from "../config/schema.js"
import {
  registryIndexSchema,
  registryItemManifestSchema,
  type RegistryIndexItem,
  type RegistrySource,
  type ResolvedRegistryItemManifest,
} from "./schema.js"

export interface RegistryRequest extends RegistrySource {
  name: string
}

interface RegistryClientDeps {
  fetch?: typeof fetch
}

export function resolveRegistryRequest(
  input: string,
  config: LoomConfig,
): RegistryRequest {
  if (isUrl(input)) {
    return {
      input,
      name: extractNameFromUrl(input),
      url: input,
    }
  }

  const namespace = input.startsWith("@")
    ? (input.split("/")[0] ?? "")
    : getDefaultRegistryNamespace(config)

  if (!namespace) {
    throw new Error(`无效的 registry namespace: ${input}`)
  }

  const name = input.startsWith("@") ? input.slice(namespace.length + 1) : input

  if (!name) {
    throw new Error(`无效的 registry item 标识: ${input}`)
  }

  const template = getRegistryTemplate(config, namespace)

  return {
    input,
    name,
    namespace,
    url: template.replace("{name}", name),
  }
}

export async function fetchRegistryItem(
  input: string,
  config: LoomConfig,
  deps: RegistryClientDeps = {},
): Promise<ResolvedRegistryItemManifest> {
  const request = resolveRegistryRequest(input, config)
  const payload = await fetchJson(request.url, deps.fetch ?? fetch)
  const parsed = registryItemManifestSchema.parse(payload)

  return {
    ...parsed,
    registrySource: {
      input: request.input,
      namespace: request.namespace,
      url: request.url,
    },
  }
}

export async function fetchRegistryIndex(
  config: LoomConfig,
  namespace = getDefaultRegistryNamespace(config),
  deps: RegistryClientDeps = {},
): Promise<RegistryIndexItem[]> {
  const template = getRegistryTemplate(config, namespace)
  const payload = await fetchJson(
    template.replace("{name}", "registry"),
    deps.fetch ?? fetch,
  )
  const parsed = registryIndexSchema.parse(payload)

  return Array.isArray(parsed) ? parsed : parsed.items
}

async function fetchJson(url: string, fetcher: typeof fetch) {
  const response = await fetcher(url)

  if (!response.ok) {
    throw new Error(`获取远程 registry 失败: ${url} (${response.status})`)
  }

  return response.json()
}

function isUrl(value: string) {
  return value.startsWith("http://") || value.startsWith("https://")
}

function extractNameFromUrl(url: string) {
  const pathname = new URL(url).pathname
  const basename = pathname.split("/").pop() ?? "registry-item"
  return basename.replace(/\.json$/, "")
}
