import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { z } from "zod"
import { createTemplate, type TemplateDefinition } from "./create-template.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const localTemplateLibraryEntrySchema = z.object({
  name: z.string().min(1),
  defaultProjectName: z.string().min(1),
  source: z.object({
    type: z.literal("local"),
    path: z.string().min(1),
  }),
})

const remoteTemplateLibraryEntrySchema = z.object({
  name: z.string().min(1),
  defaultProjectName: z.string().min(1),
  source: z.object({
    type: z.literal("remote"),
    repo: z.string().min(1),
  }),
})

const templateLibraryEntrySchema = z.union([
  localTemplateLibraryEntrySchema,
  remoteTemplateLibraryEntrySchema,
])

const templateLibraryManifestSchema = z.array(templateLibraryEntrySchema)

export type TemplateLibraryEntry = z.infer<typeof templateLibraryEntrySchema>

export function loadTemplateLibraryManifest(
  manifestPath = resolveTemplateLibraryManifestPath(),
): TemplateLibraryEntry[] {
  let content: string

  try {
    content = fs.readFileSync(manifestPath, "utf-8")
  } catch (error) {
    throw new Error(`模板库 manifest 不存在: ${manifestPath}`)
  }

  let parsed: unknown

  try {
    parsed = JSON.parse(content) as unknown
  } catch (error) {
    throw new Error("模板库 manifest 不是合法的 JSON")
  }

  const result = templateLibraryManifestSchema.safeParse(parsed)

  if (!result.success) {
    throw new Error(`模板库 manifest 无效: ${result.error.issues[0]?.message ?? "未知错误"}`)
  }

  return result.data
}

export function createTemplateDefinitionFromTemplateLibraryEntry(
  entry: TemplateLibraryEntry,
): TemplateDefinition {
  if (entry.source.type === "local") {
    return createTemplate({
      name: entry.name,
      title: entry.name,
      description: entry.name,
      defaultProjectName: entry.defaultProjectName,
      templateDir: entry.source.path,
    })
  }

  return createTemplate({
    name: entry.name,
    title: entry.name,
    description: entry.name,
    defaultProjectName: entry.defaultProjectName,
    repo: entry.source.repo,
  })
}

export function createRemoteTemplateDefinition(
  repo: string,
  defaultProjectName: string,
): TemplateDefinition {
  return createTemplate({
    name: repo,
    title: repo,
    description: repo,
    defaultProjectName,
    repo,
  })
}

export function deriveProjectNameFromRepo(repo: string): string | undefined {
  const trimmedRepo = repo.trim()

  if (!trimmedRepo) {
    return undefined
  }

  const withoutRef = trimmedRepo.split("#")[0]?.replace(/\/+$/, "")
  const segment = withoutRef?.split("/").filter(Boolean).pop()
  const name = segment?.replace(/\.git$/, "")

  return name || undefined
}

function resolveTemplateLibraryManifestPath() {
  return path.resolve(__dirname, "../../templates/manifest.json")
}
