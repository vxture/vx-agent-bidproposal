/**
 * @package @bidproposal/workbench
 * @layer Presentation
 * @category Business
 * @author AI-Generated
 * @date 2026-11-25
 */
import { EvidenceSession, digest } from './evidence.mjs';
import { checked } from './background.mjs';

const bytes = (v) => new TextEncoder().encode(JSON.stringify(v)).byteLength;
const clone = (v) => structuredClone(v);
const optional = async (bridge, id) => {
  const r = await bridge.request('GET', '/documents/' + id);
  if (!r.ok && r.status === 404) return null;
  return checked(r);
};
export async function loadChapterEvidence(bridge) {
  // Old projects without extraction records retain their normal drafting path.
  const extraction = await optional(bridge, 'bid_evidence_extraction');
  if (!extraction) return { state: 'not_prepared', facts: [], recommendations: [] };
  const session = await new EvidenceSession(bridge).load();
  const ready =
    session.complete &&
    session.match.job?.state === 'completed' &&
    !session.matchStale &&
    !session.errors.length;
  return {
    state: ready
      ? 'ready'
      : session.extractStale || session.matchStale
        ? 'changed'
        : 'not_prepared',
    facts: session.facts,
    recommendations: ready ? session.recommendations : [],
  };
}
export async function chapterEvidence(state, task, { budget = 28000 } = {}) {
  const selected = state.recommendations.filter((r) =>
      task.requirementIds.includes(r.requirement.id),
    ),
    ids = new Set(selected.flatMap((r) => r.factIds));
  const adopted =
    state.state === 'ready'
      ? state.facts.filter((f) => ids.has(f.id) && f.decision?.action === 'adopt')
      : [];
  const format = (f) => ({
    id: f.id,
    kind: f.kind,
    subject: f.subject,
    attribute: f.attribute,
    value: f.value,
    quote: f.quote,
    validity: f.validity,
    validUntil: f.validUntil,
    dateQuote: f.dateQuote,
    source: clone(f.source),
    location: clone(f.segment.location),
    unit: f.segment.unit,
    ...(f.segment.table !== undefined ? { table: f.segment.table, row: f.segment.row } : {}),
    flags: clone(f.flags),
    decision: {
      action: f.decision.action,
      note: f.decision.note,
      value: f.decision.value,
      at: f.decision.at,
    },
    requirementIds: selected.filter((r) => r.factIds.includes(f.id)).map((r) => r.requirement.id),
  });
  const facts = adopted.filter((f) => !f.flags.length && !f.decision.value).map(format),
    cautions = adopted.filter((f) => f.flags.length || f.decision.value).map(format);
  const requirements = task.requirements.map((r) => {
    const match = selected.find((m) => m.requirement.id === r.id),
      eligible = facts.filter((f) => f.requirementIds.includes(r.id));
    return {
      requirementId: r.id,
      text: r.text,
      status:
        match?.status === 'not_required'
          ? 'not_required'
          : eligible.length && match?.status === 'available'
            ? 'supported_candidate'
            : 'gap',
      factIds: eligible.map((f) => f.id),
      reasons: match?.reasons || [
        state.state === 'changed'
          ? '\u4f01\u4e1a\u8d44\u6599\u6216\u63a8\u8350\u5df2\u66f4\u65b0\uff0c\u5f85\u91cd\u65b0\u6838\u5bf9'
          : '\u672a\u5b8c\u6210\u4f01\u4e1a\u8bc1\u636e\u6574\u7406\u4e0e\u5339\u914d',
      ],
    };
  });
  // The same snapshot content has the same digest across sessions. Unrelated
  // sources or facts are excluded, keeping chapter-level change notices useful.
  const value = { schema: 1, state: state.state, facts, cautions, requirements };
  if (bytes(value) > budget)
    throw new Error(
      '\u672c\u7ae0\u4f01\u4e1a\u8bc1\u636e\u8d85\u51fa\u4e0a\u4e0b\u6587\u9884\u7b97\uff0c\u8bf7\u5728\u7f16\u5199\u89c4\u5212\u62c6\u5206\u672c\u7ae0\uff1b\u672a\u622a\u65ad\u8bc1\u636e',
    );
  return { ...value, digest: await digest(value) };
}
export async function saveChapterEvidence(bridge, snapshot) {
  const id = 'bid_chapter_evidence_' + crypto.randomUUID();
  const doc = checked(
    await bridge.request('PUT', '/documents/' + id, {
      markdown: JSON.stringify(snapshot),
      revision: 0,
    }),
  );
  return { id, revision: doc.revision, digest: snapshot.digest };
}
export async function readChapterEvidence(bridge, ref) {
  if (!ref) return null;
  const doc = checked(await bridge.request('GET', '/documents/' + ref.id));
  const value = JSON.parse(doc.markdown),
    { digest: saved, ...body } = value;
  if (doc.revision !== ref.revision || saved !== ref.digest || (await digest(body)) !== saved)
    throw new Error('Saved chapter evidence changed; original text is preserved');
  return value;
}
export function parseEvidenceUsage(value, snapshot, markdown) {
  if (
    value.evidenceDigest !== snapshot.digest ||
    !Array.isArray(value.usedEvidence) ||
    value.usedEvidence.length > 60 ||
    new Set(value.usedEvidence.map((v) => v.factId)).size !== value.usedEvidence.length
  )
    throw new Error('Chapter evidence declaration differs from its pinned input');
  return value.usedEvidence.map((v) => {
    if (
      !snapshot.facts.some((f) => f.id === v.factId) ||
      typeof v.quote !== 'string' ||
      !v.quote.trim() ||
      v.quote.length > 1600 ||
      !markdown.includes(v.quote)
    )
      throw new Error('Chapter citation is foreign, unsupported or absent from the Markdown');
    return { factId: v.factId, quote: v.quote };
  });
}
export function chapterEvidenceGaps(snapshot) {
  return (
    snapshot?.requirements
      .filter((r) => r.status === 'gap')
      .map((r) => r.text + '\uff1a' + r.reasons.join('\uff1b')) || []
  );
}
