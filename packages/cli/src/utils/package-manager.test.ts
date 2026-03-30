import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import {
  detectPackageManager,
  detectPackageManagerForProject,
} from "./package-manager.js"

test("detectPackageManager reads the current user agent", () => {
  assert.equal(detectPackageManager("pnpm/10.0.0 node/v22.0.0"), "pnpm")
  assert.equal(detectPackageManager("npm/10.0.0 node/v22.0.0"), "npm")
})

test("detectPackageManagerForProject prefers project lockfiles", () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "loom-package-manager-"))

  try {
    fs.writeFileSync(path.join(tmpRoot, "package-lock.json"), "{}")

    assert.equal(
      detectPackageManagerForProject(tmpRoot, "pnpm/10.0.0 node/v22.0.0"),
      "npm",
    )
  } finally {
    fs.rmSync(tmpRoot, { force: true, recursive: true })
  }
})

test("detectPackageManagerForProject falls back to the current user agent", () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "loom-package-manager-"))

  try {
    assert.equal(
      detectPackageManagerForProject(tmpRoot, "yarn/4.9.1 node/v22.0.0"),
      "yarn",
    )
  } finally {
    fs.rmSync(tmpRoot, { force: true, recursive: true })
  }
})
