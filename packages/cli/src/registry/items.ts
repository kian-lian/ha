import type { RegistryIndexItem } from "./schema.js"

export function getRegistryItemChoices(registryItems: RegistryIndexItem[]) {
  return registryItems.map((item) => ({
    title: item.title,
    description: item.description,
    value: item.name,
  }))
}
