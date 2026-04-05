import assert from "node:assert/strict"
import test from "node:test"
import { validateProjectName } from "./validate.js"

test("validateProjectName accepts a safe single-directory project name", () => {
  assert.equal(validateProjectName("acme-web"), true)
})

test("validateProjectName rejects path-like and scoped names", () => {
  for (const projectName of ["foo/bar", "a/../../escape", "@scope/pkg", "foo/"]) {
    assert.notEqual(validateProjectName(projectName), true)
  }
})
