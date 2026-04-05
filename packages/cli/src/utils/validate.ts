import z from "zod/v4"

const PROJECT_NAME_RULE = /^[a-z0-9][a-z0-9._-]*$/

export const projectNameSchema = z
  .string()
  .min(1, "项目名不能为空")
  .regex(
    PROJECT_NAME_RULE,
    "项目名必须是单个目录名，只能包含小写字母、数字、连字符、点、下划线",
  )
  .refine((value) => !value.endsWith("."), "项目名不能以点结尾")

export function validateProjectName(name: string): string | boolean {
  const result = projectNameSchema.safeParse(name)
  if (!result.success) {
    return result.error.issues[0]?.message ?? "项目名称错误"
  }
  return true
}
