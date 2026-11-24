/**
 * @package @bidproposal/app
 * @layer Application
 * @category Tests
 * @author AI-Generated
 * @date 2026-11-25
 */
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import ts from "typescript";
import { createRequire } from "node:module";

test("generated browser application has a closed, browser-resolvable static module graph", () => {
  execFileSync(process.execPath, ["workbench/build.mjs"], {
    cwd: process.cwd(),
    stdio: "pipe",
  });
  const root = resolve("public/workbench");
  for (const name of readdirSync(root).filter((name) =>
    name.endsWith(".mjs"),
  )) {
    const source = ts.createSourceFile(
      name,
      readFileSync(join(root, name), "utf8"),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.JS,
    );
    for (const statement of source.statements) {
      if (
        !ts.isImportDeclaration(statement) &&
        !ts.isExportDeclaration(statement)
      )
        continue;
      const specifier = statement.moduleSpecifier;
      if (!specifier || !ts.isStringLiteral(specifier)) continue;
      assert.ok(
        specifier.text.startsWith("./"),
        name + ": browser cannot resolve " + specifier.text,
      );
      assert.ok(
        existsSync(join(root, specifier.text)),
        name + ": missing " + specifier.text,
      );
    }
  }
  const environment = readFileSync(join(root, "environment.mjs"), "utf8");
  assert.match(environment, /publish = items => window.parent.postMessage/);
  assert.doesNotMatch(environment, /@bidproposal\/workbench/);
  const require = createRequire(resolve("package.json"));
  for (const resource of ["document-reader.py", "requirements.lock"]) {
    const installed = require.resolve("@vxture/ruyin-node-runtime/" + resource);
    const output = join(
      "document-engine",
      resource === "document-reader.py" ? "reader.py" : resource,
    );
    assert.deepEqual(readFileSync(output), readFileSync(installed));
  }
});
