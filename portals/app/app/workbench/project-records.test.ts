import test from "node:test";
import assert from "node:assert/strict";
import { projectRecord } from "@bidproposal/shared/project-records";

const log = (value: unknown) => "# Bid workflow\n\n" + JSON.stringify(value);
test("collection summaries preserve recorded times and do not invent workflow history", () => {
  assert.equal(projectRecord(undefined), undefined);
  assert.equal(projectRecord("unrecognized"), undefined);
  assert.equal(projectRecord(log({})), undefined);
  assert.equal(
    projectRecord(log({ analysis: { startedAt: "invalid" } })),
    undefined,
  );
  assert.equal(projectRecord(log({ analysis: { startedAt: 123 } })), undefined);
  assert.equal(
    projectRecord(
      log({
        analysis: {
          startedAt: "2026-11-25T02:00:00Z",
          completedAt: "2026-11-24T02:00:00Z",
        },
      }),
    ),
    undefined,
  );
  assert.equal(
    projectRecord(log({ foreign: { startedAt: "2026-11-25T02:00:00Z" } })),
    undefined,
  );
  const result = projectRecord(
    log({
      analysis: {
        startedAt: "2026-11-25T02:00:00Z",
        completedAt: "2026-11-25T02:08:00Z",
      },
      requirements: { startedAt: "2026-11-25T02:10:00Z" },
    }),
  );
  assert.deepEqual(result, {
    stage: "\u9700\u6c42\u786e\u8ba4",
    stageIndex: 1,
    completed: 1,
    completedStages: [0],
    recordedAt: "2026-11-25T02:10:00.000Z",
    complete: false,
  });
});
test("a reopened earlier stage is the most recent record, not the highest stage number", () => {
  const result = projectRecord(
    log({
      analysis: { startedAt: "2026-11-25T03:00:00Z" },
      export: {
        startedAt: "2026-11-24T02:00:00Z",
        completedAt: "2026-11-24T02:10:00Z",
      },
    }),
  );
  assert.equal(result?.stage, "\u62db\u6807\u89e3\u8bfb");
  assert.equal(result?.complete, false);
  assert.deepEqual(result?.completedStages, [5]);
});
