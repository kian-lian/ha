import { createTemplate } from "./create-template.js"

export const viteTemplate = createTemplate({
  name: "vite",
  title: "Vite React",
  description: "Vite + React + TypeScript（内置 vendored 模板）",
  defaultProjectName: "vite-app",
  templateDir: "vite-react-ts",
})
