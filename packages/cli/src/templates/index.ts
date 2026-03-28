import { nextTemplate } from "./next.js"
import type { TemplateDefinition } from "./create-template.js"
import { viteTemplate } from "./vite.js"

export { createTemplate } from "./create-template.js"
export type { TemplateDefinition, TemplateScaffoldOptions } from "./create-template.js"

export const templates: Record<string, TemplateDefinition> = {
  next: nextTemplate,
  vite: viteTemplate,
}

export type TemplateName = string

export function getTemplate(name: string, registry = templates) {
  return registry[name]
}

export function getTemplateChoices(registry = templates) {
  // prompts 的 select 直接消费这一层结构，命令层不需要知道模板细节。
  return Object.values(registry).map((template) => ({
    title: template.title,
    description: template.description,
    value: template.name,
  }))
}
