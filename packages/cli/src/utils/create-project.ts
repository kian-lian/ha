import fs from "node:fs"
import path from "node:path"
import prompts from "prompts"
import {
  createDefaultLoomConfig,
  hasLoomConfig,
  isReactTypeScriptProject,
  writeLoomConfig,
} from "../config/index.js"
import {
  getTemplate,
  getTemplateChoices,
  templates,
  type TemplateDefinition,
} from "../templates/index.js"
import {
  createRemoteTemplateDefinition,
  createTemplateDefinitionFromTemplateLibraryEntry,
  deriveProjectNameFromRepo,
  loadTemplateLibraryManifest,
  type TemplateLibraryEntry,
} from "../templates/template-library.js"
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
  loadTemplateLibraryManifest?: typeof loadTemplateLibraryManifest
  createTemplateDefinitionFromTemplateLibraryEntry?: (
    entry: TemplateLibraryEntry,
  ) => TemplateDefinition
  createRemoteTemplateDefinition?: (
    repo: string,
    defaultProjectName: string,
  ) => TemplateDefinition
  deriveProjectNameFromRepo?: typeof deriveProjectNameFromRepo
}

const DEFAULT_TEMPLATE = "next"
const TEMPLATE_LIBRARY_TEMPLATE = "__template_library__"
const MANUAL_REMOTE_TEMPLATE = "__manual_remote_repo__"
const FALLBACK_REMOTE_TEMPLATE_PROJECT_NAME = "template-app"

export async function createProject(
  options: CreateProjectOptions,
  deps: CreateProjectDeps = {},
): Promise<CreateProjectResult> {
  const prompt = deps.prompt ?? prompts
  const templateRegistry = deps.templateRegistry ?? templates
  const loadManifest = deps.loadTemplateLibraryManifest ?? loadTemplateLibraryManifest
  const createTemplateFromLibraryEntry =
    deps.createTemplateDefinitionFromTemplateLibraryEntry ??
    createTemplateDefinitionFromTemplateLibraryEntry
  const createRemoteTemplateFromRepo =
    deps.createRemoteTemplateDefinition ?? createRemoteTemplateDefinition
  const deriveProjectName =
    deps.deriveProjectNameFromRepo ?? deriveProjectNameFromRepo
  const defaultTemplateName = getDefaultTemplateName(templateRegistry)

  let templateName = resolveTemplateName(options.template, templateRegistry)
  let projectName = options.name
  let resolvedTemplate: TemplateDefinition | undefined

  if (options.yes) {
    // 非交互模式下直接回退到默认模板和该模板的默认项目名。
    templateName = templateName ?? defaultTemplateName
    projectName =
      projectName ?? getTemplateDefaultProjectName(templateRegistry, templateName)
  } else {
    if (!templateName) {
      const templateAnswer = await prompt(
        {
          type: "select",
          name: "template",
          message: "选择模板",
          choices: [
            ...getTemplateChoices(templateRegistry),
            {
              title: "模板库",
              description: "选择已配置模板",
              value: TEMPLATE_LIBRARY_TEMPLATE,
            },
            {
              title: "远程仓库",
              description: "手动输入任意远程模板仓库地址",
              value: MANUAL_REMOTE_TEMPLATE,
            },
          ],
          initial: 0,
        },
        {
          onCancel: () => {
            throw new Error("已取消创建项目")
          },
        },
      )

      const selectedTemplate = templateAnswer.template ?? defaultTemplateName

      if (selectedTemplate === TEMPLATE_LIBRARY_TEMPLATE) {
        const manifestEntries = loadManifest()

        if (manifestEntries.length === 0) {
          throw new Error("模板库为空")
        }

        const manifestAnswer = await prompt(
          {
            type: "select",
            name: "templateLibraryEntry",
            message: "选择模板库模板",
            choices: manifestEntries.map((entry: TemplateLibraryEntry) => ({
              title: entry.name,
              description:
                entry.source.type === "local" ? "本地模板" : "远程模板",
              value: entry.name,
            })),
          },
          {
            onCancel: () => {
              throw new Error("已取消创建项目")
            },
          },
        )

        const entry = manifestEntries.find(
          (item: TemplateLibraryEntry) =>
            item.name === manifestAnswer.templateLibraryEntry,
        )

        if (!entry) {
          throw new Error(`未知模板库模板: ${manifestAnswer.templateLibraryEntry}`)
        }

        resolvedTemplate = createTemplateFromLibraryEntry(entry)
        templateName = resolvedTemplate.name
      } else if (selectedTemplate === MANUAL_REMOTE_TEMPLATE) {
        const remoteRepoAnswer = await prompt(
          {
            type: "text",
            name: "remoteTemplateRepo",
            message: "远程模板仓库地址:",
            validate: (value: string) =>
              value.trim() ? true : "远程模板仓库地址不能为空",
          },
          {
            onCancel: () => {
              throw new Error("已取消创建项目")
            },
          },
        )

        const repo = remoteRepoAnswer.remoteTemplateRepo.trim()
        const defaultProjectName =
          deriveProjectName(repo) ?? FALLBACK_REMOTE_TEMPLATE_PROJECT_NAME

        resolvedTemplate = createRemoteTemplateFromRepo(repo, defaultProjectName)
        templateName = resolvedTemplate.name
      } else {
        templateName = selectedTemplate
      }
    }

    if (!projectName) {
      const projectNameAnswer = await prompt(
        {
          type: "text",
          name: "projectName",
          message: "项目名称:",
          initial:
            resolvedTemplate?.defaultProjectName ??
            getTemplateDefaultProjectName(templateRegistry, templateName) ??
            getTemplateDefaultProjectName(templateRegistry, defaultTemplateName),
          validate: (value: string) => validateProjectName(value),
        },
        {
          onCancel: () => {
            throw new Error("已取消创建项目")
          },
        },
      )

      projectName = projectNameAnswer.projectName
    }
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

  const template =
    resolvedTemplate ?? getTemplate(templateName, templateRegistry)
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
    yes: options.yes,
  })

  // 对 React + TypeScript 模板自动补一份 loom.json，用户创建后可以直接执行 add。
  if (isReactTypeScriptProject(projectPath) && !hasLoomConfig(projectPath)) {
    writeLoomConfig(projectPath, createDefaultLoomConfig(projectPath))
  }

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
