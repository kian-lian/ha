import assert from "node:assert/strict"
import test from "node:test"
import {
  getRegistryIndex,
  getRegistryItem,
  resolveRegistryFileRequest,
} from "./registry.ts"

test("getRegistryIndex returns the published hook list", () => {
  const index = getRegistryIndex()

  assert.ok(index.length > 0)
  assert.deepEqual(index[0], {
    name: "use-toggle",
    type: "registry:hook",
    title: "use-toggle",
    description: "管理布尔值切换的基础 hook",
  })
})

test("getRegistryItem inlines hook source content", () => {
  const item = getRegistryItem("use-toggle")

  assert.ok(item)
  assert.equal(item?.name, "use-toggle")
  assert.equal(item?.files[0]?.path, "registry/hooks/use-toggle.ts")
  assert.match(item?.files[0]?.content ?? "", /export function useToggle/)
})

test("resolveRegistryFileRequest parses registry and item json filenames", () => {
  assert.deepEqual(resolveRegistryFileRequest("registry.json"), {
    kind: "index",
  })

  assert.deepEqual(resolveRegistryFileRequest("use-toggle.json"), {
    kind: "item",
    name: "use-toggle",
  })

  assert.equal(resolveRegistryFileRequest("use-toggle"), null)
})
