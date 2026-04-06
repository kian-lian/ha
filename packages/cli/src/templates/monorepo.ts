import {
  delegateToTurboCli,
  type CreateTurboAppOptions,
} from "../utils/official-cli.js"
import { createTemplate, type TemplateScaffoldOptions } from "./create-template.js"

interface MonorepoTemplateDeps {
  delegateToTurboCli?: (
    options: CreateTurboAppOptions,
  ) => Promise<void>
}

export async function scaffoldMonorepoApp(
  options: TemplateScaffoldOptions,
  deps: MonorepoTemplateDeps = {},
) {
  await (deps.delegateToTurboCli ?? delegateToTurboCli)({
    packageManager: options.packageManager,
    targetDir: options.projectPath,
    ...(options.yes !== undefined ? { yes: options.yes } : {}),
  })

  return { dependenciesInstalled: true }
}

export const monorepoTemplate = createTemplate({
  name: "monorepo",
  title: "Monorepo",
  description: "Turborepo starter",
  defaultProjectName: "my-turborepo",
  scaffold: scaffoldMonorepoApp,
})
