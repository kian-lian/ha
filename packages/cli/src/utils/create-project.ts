import fs from "node:fs"
import path from "node:path"
import prompts from "prompts"
import {
  getTemplate,
  getTemplateChoices,
  templates,
  type TemplateDefinition,
} from "../templates/index.js"
import { detectPackageManager, type PackageManager } from "./package-manager.js"
import { validateProjectName } from "./validate.js"

export interface CreateProjectOptions {
  cwd: string
  name?: string
  template?: string
  yes?: boolean
  packageManager?: PackageManager
}

export interface CreateProjectResult {
  dependenciesInstalled: boolean
  packageManager: PackageManager
  projectName: string
  projectPath: string
  template: string
}

interface CreateProjectDeps {
  prompt?: typeof prompts
  templateRegistry?: Record<string, TemplateDefinition>
}

const DEFAULT_TEMPLATE = "next"

export async function createProject(
  options: CreateProjectOptions,
  deps: CreateProjectDeps = {},
): Promise<CreateProjectResult> {
  const prompt = deps.prompt ?? prompts
  const templateRegistry = deps.templateRegistry ?? templates
  const defaultTemplateName = getDefaultTemplateName(templateRegistry)

  let templateName = resolveTemplateName(options.template, templateRegistry)
  let projectName = options.name

  if (options.yes) {
    // 非交互模式下直接回退到默认模板和该模板的默认项目名。
    templateName = templateName ?? defaultTemplateName
    projectName =
      projectName ?? getTemplateDefaultProjectName(templateRegistry, templateName)
  } else {
    const answers = await prompt([
      {
        type: templateName ? null : "select",
        name: "template",
        message: "选择模板",
        choices: getTemplateChoices(templateRegistry),
        initial: 0,
      },
      {
        type: projectName ? null : "text",
        name: "projectName",
        message: "项目名称:",
        initial:
          projectName ??
          (templateName
            ? getTemplateDefaultProjectName(templateRegistry, templateName)
            : getTemplateDefaultProjectName(templateRegistry, defaultTemplateName)),
        validate: (value: string) => validateProjectName(value),
      },
    ])

    // 交互模式允许“部分参数由命令行传入，剩余部分走提示补全”。
    templateName = templateName ?? answers.template ?? defaultTemplateName
    projectName = projectName ?? answers.projectName
  }

  if (!templateName) {
    throw new Error("至少需要一个可用模板")
  }

  if (!projectName) {
    throw new Error("项目名称不能为空")
  }

  const projectNameValidation = validateProjectName(projectName)
  if (projectNameValidation !== true) {
    throw new Error(String(projectNameValidation))
  }

  const template = getTemplate(templateName, templateRegistry)
  if (!template) {
    throw new Error(`未知模板: ${templateName}`)
  }

  const projectPath = path.resolve(options.cwd, projectName)
  if (fs.existsSync(projectPath)) {
    throw new Error(`目录 ${projectName} 已存在`)
  }

  // scaffold 只接收已经规整好的输入，不再关心交互或默认值解析。
  const packageManager = options.packageManager ?? detectPackageManager()
  const result = await template.scaffold({
    cwd: options.cwd,
    packageManager,
    projectName,
    projectPath,
  })

  return {
    dependenciesInstalled: result.dependenciesInstalled,
    packageManager,
    projectName,
    projectPath,
    template: template.name,
  }
}

function resolveTemplateName(
  templateName: string | undefined,
  templateRegistry: Record<string, TemplateDefinition>,
) {
  if (!templateName) {
    return undefined
  }

  if (!getTemplate(templateName, templateRegistry)) {
    throw new Error(`未知模板: ${templateName}`)
  }

  return templateName
}

function getDefaultTemplateName(
  templateRegistry: Record<string, TemplateDefinition>,
) {
  if (templateRegistry[DEFAULT_TEMPLATE]) {
    return DEFAULT_TEMPLATE
  }

  // 当默认模板被移除时，退回到注册表中的第一个模板，避免 create 直接失效。
  return Object.keys(templateRegistry)[0]
}

function getTemplateDefaultProjectName(
  templateRegistry: Record<string, TemplateDefinition>,
  templateName: string | undefined,
) {
  if (!templateName) {
    return undefined
  }

  return templateRegistry[templateName]?.defaultProjectName
}
