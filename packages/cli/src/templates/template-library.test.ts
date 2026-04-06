import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import {
  createTemplateDefinitionFromTemplateLibraryEntry,
  deriveProjectNameFromRepo,
  loadTemplateLibraryManifest,
} from "./template-library.js"

test("loadTemplateLibraryManifest parses local and remote entries", () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "loom-template-library-"))
  const manifestPath = path.join(tmpRoot, "manifest.json")

  try {
    fs.writeFileSync(
      manifestPath,
      JSON.stringify(
        [
          {
            name: "vite-react-ts",
            defaultProjectName: "vite-app",
            source: {
              type: "local",
              path: "vite-react-ts",
            },
          },
          {
            name: "team-next-remote",
            defaultProjectName: "next-app",
            source: {
              type: "remote",
              repo: "github:your-org/templates/team-next-remote#main",
            },
          },
        ],
        null,
        2,
      ),
    )

    assert.deepEqual(loadTemplateLibraryManifest(manifestPath), [
      {
        name: "vite-react-ts",
        defaultProjectName: "vite-app",
        source: {
          type: "local",
          path: "vite-react-ts",
        },
      },
      {
        name: "team-next-remote",
        defaultProjectName: "next-app",
        source: {
          type: "remote",
          repo: "github:your-org/templates/team-next-remote#main",
        },
      },
    ])
  } finally {
    fs.rmSync(tmpRoot, { force: true, recursive: true })
  }
})

test("loadTemplateLibraryManifest rejects invalid entries", () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "loom-template-library-"))
  const manifestPath = path.join(tmpRoot, "manifest.json")

  try {
    fs.writeFileSync(
      manifestPath,
      JSON.stringify(
        [
          {
            name: "broken-item",
            source: {
              type: "local",
            },
          },
        ],
        null,
        2,
      ),
    )

    assert.throws(
      () => loadTemplateLibraryManifest(manifestPath),
      /模板库 manifest 无效/,
    )
  } finally {
    fs.rmSync(tmpRoot, { force: true, recursive: true })
  }
})

test("createTemplateDefinitionFromTemplateLibraryEntry maps local and remote entries", () => {
  const localTemplate = createTemplateDefinitionFromTemplateLibraryEntry({
    name: "vite-react-ts",
    defaultProjectName: "vite-app",
    source: {
      type: "local",
      path: "vite-react-ts",
    },
  })
  const remoteTemplate = createTemplateDefinitionFromTemplateLibraryEntry({
    name: "team-next-remote",
    defaultProjectName: "next-app",
    source: {
      type: "remote",
      repo: "github:your-org/templates/team-next-remote#main",
    },
  })

  assert.equal(localTemplate.name, "vite-react-ts")
  assert.equal(localTemplate.defaultProjectName, "vite-app")
  assert.equal(localTemplate.templateDir, "vite-react-ts")
  assert.equal(remoteTemplate.name, "team-next-remote")
  assert.equal(remoteTemplate.defaultProjectName, "next-app")
  assert.equal(
    remoteTemplate.repo,
    "github:your-org/templates/team-next-remote#main",
  )
})

test("deriveProjectNameFromRepo uses the last path-like segment and strips refs", () => {
  assert.equal(
    deriveProjectNameFromRepo("github:your-org/templates/team-next-remote#main"),
    "team-next-remote",
  )
  assert.equal(
    deriveProjectNameFromRepo("https://github.com/your-org/acme-template.git"),
    "acme-template",
  )
  assert.equal(deriveProjectNameFromRepo(""), undefined)
})
