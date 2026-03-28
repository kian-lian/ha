import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import { prepareVendoredTemplateProject } from "./create-template.js"

test("prepareVendoredTemplateProject removes pnpm workspace metadata for vendored apps", () => {
  const projectPath = fs.mkdtempSync(path.join(os.tmpdir(), "loom-vendored-template-"))

  try {
    fs.writeFileSync(path.join(projectPath, "pnpm-workspace.yaml"), "packages: []\n")
    fs.writeFileSync(path.join(projectPath, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n")

    prepareVendoredTemplateProject(projectPath, "pnpm")

    assert.equal(fs.existsSync(path.join(projectPath, "pnpm-workspace.yaml")), false)
    assert.equal(fs.existsSync(path.join(projectPath, "pnpm-lock.yaml")), true)
  } finally {
    fs.rmSync(projectPath, { force: true, recursive: true })
  }
})

test("prepareVendoredTemplateProject removes unmatched lockfiles", () => {
  const projectPath = fs.mkdtempSync(path.join(os.tmpdir(), "loom-vendored-template-"))

  try {
    fs.writeFileSync(path.join(projectPath, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n")
    fs.writeFileSync(path.join(projectPath, "package-lock.json"), "{}\n")

    prepareVendoredTemplateProject(projectPath, "npm")

    assert.equal(fs.existsSync(path.join(projectPath, "pnpm-lock.yaml")), false)
    assert.equal(fs.existsSync(path.join(projectPath, "package-lock.json")), true)
  } finally {
    fs.rmSync(projectPath, { force: true, recursive: true })
  }
})
