import prompts from "prompts"
import { loadLoomConfig } from "../config/index.js"
import type { LoomConfig } from "../config/schema.js"
import { fetchRegistryIndex, fetchRegistryItem } from "../registry/client.js"
import { getRegistryItemChoices } from "../registry/items.js"
import type {
  RegistryIndexItem,
  ResolvedRegistryItemManifest,
} from "../registry/schema.js"

export interface AddItemsOptions {
  cwd: string
  items: string[]
  yes?: boolean
}

export interface AddItemsResult {
  config: LoomConfig
  items: ResolvedRegistryItemManifest[]
}

interface AddItemsDeps {
  prompt?: typeof prompts
  loadConfig?: (cwd: string) => LoomConfig
  fetchRegistryItem?: (
    input: string,
    config: LoomConfig,
  ) => Promise<ResolvedRegistryItemManifest>
  fetchRegistryIndex?: (config: LoomConfig) => Promise<RegistryIndexItem[]>
}

export async function addItems(
  options: AddItemsOptions,
  deps: AddItemsDeps = {},
): Promise<AddItemsResult> {
  const prompt = deps.prompt ?? prompts
  const loadConfig = deps.loadConfig ?? loadLoomConfig
  const fetchItemFromRegistry = deps.fetchRegistryItem ?? fetchRegistryItem
  const fetchIndexFromRegistry = deps.fetchRegistryIndex ?? fetchRegistryIndex

  // add 命令必须先拿到项目级配置，后面的 hooks 目录、alias、registry 都靠它。
  const config = loadConfig(options.cwd)

  let requestedNames = normalizeItemNames(options.items)

  // 没传名称时，非 --yes 模式允许走交互选择。
  if (requestedNames.length === 0 && !options.yes) {
    const registryIndex = await fetchIndexFromRegistry(config)
    const answers = await prompt([
      {
        type: "multiselect",
        name: "items",
        message: "选择要添加的 hooks",
        choices: getRegistryItemChoices(registryIndex),
        min: 1,
      },
    ])

    requestedNames = normalizeItemNames(answers.items)
  }

  if (requestedNames.length === 0) {
    throw new Error("至少需要提供一个 hook 名称")
  }

  const resolvedItems = await resolveRegistryDependencies(
    requestedNames,
    config,
    fetchItemFromRegistry,
  )

  return {
    config,
    items: resolvedItems,
  }
}

function normalizeItemNames(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

async function resolveRegistryDependencies(
  requestedNames: string[],
  config: LoomConfig,
  fetchItemFromRegistry: (
    input: string,
    config: LoomConfig,
  ) => Promise<ResolvedRegistryItemManifest>,
) {
  const resolvedItems = new Map<string, ResolvedRegistryItemManifest>()

  const visit = async (
    requestedInput: string,
    parentItem?: ResolvedRegistryItemManifest,
  ) => {
    const nextInput = qualifyRegistryInput(requestedInput, parentItem)
    const item = await fetchItemFromRegistry(nextInput, config)

    if (resolvedItems.has(item.name)) {
      return
    }

    for (const dependencyName of item.registryDependencies) {
      await visit(dependencyName, item)
    }

    resolvedItems.set(item.name, item)
  }

  for (const requestedName of requestedNames) {
    await visit(requestedName)
  }

  return [...resolvedItems.values()]
}

function qualifyRegistryInput(
  requestedInput: string,
  parentItem?: ResolvedRegistryItemManifest,
) {
  if (
    requestedInput.startsWith("http://") ||
    requestedInput.startsWith("https://") ||
    requestedInput.startsWith("@")
  ) {
    return requestedInput
  }

  if (parentItem?.registrySource.namespace) {
    return `${parentItem.registrySource.namespace}/${requestedInput}`
  }

  return requestedInput
}
