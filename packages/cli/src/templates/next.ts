import { copyTemplateFiles } from "../utils/template-fs.js"
import { fetchTemplate, type FetchTemplateResult } from "../utils/template.js"
import { createTemplate, type TemplateScaffoldOptions } from "./create-template.js"

const NEXT_TEMPLATE_OVERLAY_DIR = "next-app"
const NEXT_TEMPLATE_OVERLAY_FILES = ["AGENTS.md", "CLAUDE.md"]

export const NEXT_CLI_PACKAGE_SPEC = "create-next-app@16.2.1"

interface NextTemplateDeps {
  fetchTemplate?: typeof fetchTemplate
}

export async function scaffoldNextApp(
  options: TemplateScaffoldOptions,
  deps: NextTemplateDeps = {},
): Promise<FetchTemplateResult> {
  const result = await (deps.fetchTemplate ?? fetchTemplate)(
    `next-cli:${NEXT_CLI_PACKAGE_SPEC}`,
    options.projectPath,
    {
      packageManager: options.packageManager,
      projectName: options.projectName,
      ...(options.yes !== undefined ? { yes: options.yes } : {}),
    },
  )

  copyTemplateFiles(
    NEXT_TEMPLATE_OVERLAY_DIR,
    options.projectPath,
    NEXT_TEMPLATE_OVERLAY_FILES,
    { projectName: options.projectName },
  )

  return result
}

export const nextTemplate = createTemplate({
  name: "next",
  title: "Next.js App",
  description: "Next.js App",
  defaultProjectName: "next-app",
  scaffold: scaffoldNextApp,
})
