import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WorkflowNavigation } from "@bidproposal/shared/presentation";

const steps = [
  { id: "analysis", label: "Analysis", state: "complete" as const,
    startedAt: "2026-11-25T01:10:00Z", completedAt: "2026-11-25T01:18:00Z" },
  { id: "requirements", label: "Requirements", state: "active" as const,
    startedAt: "2026-11-25T01:20:00Z" },
];
const render = (collapsed: boolean, activeId: string) => renderToStaticMarkup(
  createElement(WorkflowNavigation, { steps, collapsed, activeId, projectId: "retained",
    onToggle() {}, pending: 3 }),
);

test("flow selection preserves recorded business facts and keeps start/end separate from duration", () => {
  const first = render(false, "analysis"), second = render(false, "requirements");
  for (const html of [first, second]) {
    assert.match(html, /aria-label="Analysis \u00b7 \u5df2\u5b8c\u6210"/);
    assert.match(html, /aria-label="Requirements \u00b7 \u8fdb\u884c\u4e2d"/);
    assert.equal((html.match(/class="jadera-step-range"/g) || []).length, 2);
    assert.equal((html.match(/class="jadera-step-duration"/g) || []).length, 2);
    assert.match(html, /8 \u5206\u949f/);
    assert.match(html, /3 \u9879\u5f85\u786e\u8ba4/);
  }
  assert.deepEqual(steps[0], { id: "analysis", label: "Analysis", state: "complete",
    startedAt: "2026-11-25T01:10:00Z", completedAt: "2026-11-25T01:18:00Z" });
});

test("collapsed navigation preserves every source time and target while replacing stage icons with a number or check", () => {
  const expanded = render(false, "requirements"), collapsed = render(true, "requirements");
  const values = (html: string, pattern: RegExp) => [...html.matchAll(pattern)].map(match => match[1]);
  assert.deepEqual(values(collapsed, /href="([^"]+)"/g), values(expanded, /href="([^"]+)"/g));
  assert.deepEqual(values(collapsed, /<time>([^<]+)<\/time>/g), values(expanded, /<time>([^<]+)<\/time>/g));
  assert.match(collapsed, /jadera-flow-symbol selected">2<\/span>/);
  assert.doesNotMatch(collapsed, />\u2713</);
  assert.equal((collapsed.match(/jadera-flow-item collapsed/g) || []).length, 2);
});
