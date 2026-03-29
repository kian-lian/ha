import z from "zod/v4"

// v1 先只支持 hook，后面加 component / util 时再扩展这里。
export const registryItemTypeSchema = z.enum(["registry:hook"])

const registryFileSchema = z.object({
  // path 表示 registry 侧的源码路径，主要用于调试和后续构建工具。
  path: z.string().min(1, "files[].path 不能为空"),
  // content 直接内联文件内容，这也是远程 registry 和本地模板的核心区别。
  content: z.string().min(1, "files[].content 不能为空"),
  type: registryItemTypeSchema,
  // target 允许未来自定义落地文件名；不传时默认用 path 的 basename。
  target: z.string().min(1, "files[].target 不能为空").optional(),
})

export const registryIndexItemSchema = z.object({
  name: z.string().min(1, "name 不能为空"),
  type: registryItemTypeSchema,
  title: z.string().min(1, "title 不能为空"),
  description: z.string().optional(),
})

export const registryIndexSchema = z.union([
  z.array(registryIndexItemSchema),
  z.object({
    items: z.array(registryIndexItemSchema),
  }),
])

export interface RegistrySource {
  input: string
  url: string
  namespace?: string
}

export const registryItemManifestSchema = z.object({
  name: z.string().min(1, "name 不能为空"),
  type: registryItemTypeSchema,
  title: z.string().min(1, "title 不能为空"),
  description: z.string().optional(),
  files: z.array(registryFileSchema).min(1, "至少需要一个文件"),
  dependencies: z.array(z.string().min(1)).default([]),
  devDependencies: z.array(z.string().min(1)).default([]),
  registryDependencies: z.array(z.string().min(1)).default([]),
})

export type RegistryItemType = z.infer<typeof registryItemTypeSchema>
export type RegistryItemManifest = z.infer<typeof registryItemManifestSchema>
export type RegistryIndexItem = z.infer<typeof registryIndexItemSchema>
export type ResolvedRegistryItemManifest = RegistryItemManifest & {
  registrySource: RegistrySource
}
