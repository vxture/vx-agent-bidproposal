import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ddlTables,
  prismaTables,
} from "../../../scripts/guardrails/check-data-architecture.mjs";

test("ddlTables extracts schema.table pairs", () => {
  const s = ddlTables(
    "CREATE TABLE IF NOT EXISTS vx_provision.app_instance (\n  id UUID\n);\n" +
      "CREATE TABLE IF NOT EXISTS local_usage.raw (id UUID);",
  );
  assert.ok(s.has("vx_provision.app_instance"));
  assert.ok(s.has("local_usage.raw"));
  assert.equal(s.size, 2);
});

test("prismaTables extracts @@schema + @@map pairs", () => {
  const s = prismaTables(
    'model AppInstance {\n  id String @id\n  @@map("app_instance")\n  @@schema("vx_provision")\n}\n',
  );
  assert.ok(s.has("vx_provision.app_instance"));
});

test("drift is detectable (a table only in DDL is not in prisma)", () => {
  const ddl = ddlTables("CREATE TABLE IF NOT EXISTS a.only_in_ddl (id UUID);");
  const prisma = prismaTables('model X {\n  @@map("other")\n  @@schema("a")\n}\n');
  const onlyDdl = [...ddl].filter((t) => !prisma.has(t));
  assert.deepEqual(onlyDdl, ["a.only_in_ddl"]);
});
