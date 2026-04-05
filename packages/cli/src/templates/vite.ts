import {
  delegateToViteCli,
  type CreateViteAppOptions,
} from "../utils/official-cli.js"
import { createTemplate, type TemplateScaffoldOptions } from "./create-template.js"

interface ViteTemplateDeps {
  delegateToViteCli?: (
    options: CreateViteAppOptions,
  ) => Promise<void>
}

export async function scaffoldViteApp(
  options: TemplateScaffoldOptions,
  deps: ViteTemplateDeps = {},
) {
  await (deps.delegateToViteCli ?? delegateToViteCli)({
    packageManager: options.packageManager,
    targetDir: options.projectPath,
    ...(options.yes !== undefined ? { yes: options.yes } : {}),
  })

  return { dependenciesInstalled: true }
}

export const viteTemplate = createTemplate({
  name: "vite",
  title: "Vite",
  description: "Vite App",
  defaultProjectName: "vite-app",
  scaffold: scaffoldViteApp,
})
