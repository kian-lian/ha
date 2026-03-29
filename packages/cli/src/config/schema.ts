import z from "zod/v4"

export const DEFAULT_REGISTRY_NAMESPACE = "@loom"
export const DEFAULT_REGISTRY_TEMPLATE = "http://localhost:3001/r/{name}.json"

const registryTemplateSchema = z
  .string()
  .min(1, "registry url 不能为空")
  .refine(
    (value) => value.includes("{name}"),
    "registry url 必须包含 {name} 占位符",
  )

export const loomConfigSchema = z.object({
  paths: z.object({
    hooks: z.string().min(1, "paths.hooks 不能为空"),
  }),
  aliases: z
    .object({
      hooks: z.string().min(1, "aliases.hooks 不能为空").optional(),
    })
    .default({}),
  registries: z
    .object({
      default: z
        .string()
        .min(1, "registries.default 不能为空")
        .default(DEFAULT_REGISTRY_NAMESPACE),
      items: z
        .record(z.string().min(1), registryTemplateSchema)
        .default({
          [DEFAULT_REGISTRY_NAMESPACE]: DEFAULT_REGISTRY_TEMPLATE,
        }),
    })
    .default({
      default: DEFAULT_REGISTRY_NAMESPACE,
      items: {
        [DEFAULT_REGISTRY_NAMESPACE]: DEFAULT_REGISTRY_TEMPLATE,
      },
    }),
})

export type LoomConfig = z.infer<typeof loomConfigSchema>
