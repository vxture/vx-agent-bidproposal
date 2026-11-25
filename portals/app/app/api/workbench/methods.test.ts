import test from "node:test";
import assert from "node:assert/strict";
import { GET, POST, PUT, DELETE, PATCH } from "./[[...path]]/route";

test("name updates expose PATCH through the same authenticated route as other project mutations", async () => {
  assert.equal(PATCH, POST);
  assert.equal(PATCH, PUT);
  assert.equal(PATCH, DELETE);
  assert.equal(PATCH, GET);
  const response = await PATCH(
    new Request(
      "https://jadera.test/api/workbench/host/projects/example/compilations",
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ label: "Updated", revision: 0 }),
      },
    ),
    {
      params: Promise.resolve({
        path: ["host", "projects", "example", "compilations"],
      }),
    },
  );
  assert.equal(response.status, 401);
  assert.equal((await response.json()).retryable, false);
});
