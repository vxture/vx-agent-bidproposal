import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("deploy and rollback isolate remote scripts across products, runs and retries", () => {
  for (const operation of ["deploy", "rollback"]) {
    const workflow = readFileSync(new URL(`../../../../.github/workflows/${operation}.yml`, import.meta.url), "utf8");
    assert.ok(workflow.includes(`remote_script="/tmp/\${PRODUCT_CODE}-${operation}-\${GITHUB_RUN_ID}-\${GITHUB_RUN_ATTEMPT}.sh"`));
    assert.ok(workflow.includes(`bash -n /tmp/${operation}.sh`));
    assert.ok(workflow.includes('"$DEPLOY_USER@$DEPLOY_HOST:$remote_script"'));
    assert.ok(workflow.includes("printf -v remote_script_command 'bash %q' \"$remote_script\""));
    assert.equal(workflow.includes(`remote_cmd+="bash /tmp/${operation}.sh"`), false);
  }
});
