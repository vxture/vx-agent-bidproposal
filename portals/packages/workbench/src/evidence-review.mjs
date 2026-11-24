/**
 * @package @bidproposal/workbench
 * @layer Presentation
 * @category Business
 * @author AI-Generated
 * @date 2026-11-25
 */
import { loadChapterEvidence, chapterEvidence, readChapterEvidence } from './chapter-evidence.mjs';
import { digest } from './evidence.mjs';

export const EVIDENCE_CATEGORIES = [
  'evidence_missing',
  'evidence_expired',
  'evidence_conflict',
  'evidence_mismatch',
  'evidence_changed',
  'cross_chapter',
];
const bytes = (v) => new TextEncoder().encode(JSON.stringify(v)).byteLength;
const clone = (v) => structuredClone(v);
export const reviewDate = () => {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
};
const optional = async (bridge, id) => {
  const r = await bridge.request('GET', '/documents/' + id);
  if (!r.ok && r.status === 404) return null;
  if (!r.ok) throw new Error(r.error?.message || 'Review source unavailable');
  return r.body;
};
export async function evidenceRevisions(bridge) {
  const ids = [
      'runtime_library_selection',
      'bid_evidence_extraction',
      'bid_evidence_matching',
      'bid_evidence_decisions',
    ],
    values = await Promise.all(ids.map((id) => optional(bridge, id))),
    writing = await optional(bridge, 'bid_writing'),
    progress = writing
      ? JSON.parse(writing.markdown.slice('# Bid writing progress\n\n'.length))
      : null;
  const accepted =
    progress?.items.map((i) => ({
      id: i.id,
      evidenceRef: i.evidenceRef || null,
      usedEvidence: i.usedEvidence || [],
    })) || [];
  return {
    ...Object.fromEntries(ids.map((id, index) => [id, values[index]?.revision || 0])),
    bid_writing: writing?.revision || 0,
    chapterEvidence: await digest(accepted),
  };
}
export async function prepareEvidenceReview(
  bridge,
  tasks,
  draft,
  progress,
  { asOf = reviewDate(), budget = 70000 } = {},
) {
  const current = await loadChapterEvidence(bridge),
    items = [];
  for (const task of tasks) {
    const chapter = draft.chapters.find((c) => c.id === task.id),
      record = progress?.items.find((i) => i.id === task.id),
      checks = [];
    let pinned = null;
    if (record?.evidenceRef) {
      try {
        pinned = await readChapterEvidence(bridge, record.evidenceRef);
      } catch (e) {
        checks.push({ kind: 'snapshot_unavailable', detail: e.message });
      }
    } else
      checks.push({
        kind: 'no_source_record',
        detail: 'This chapter has no saved enterprise source record; do not invent one.',
      });
    const usage = (record?.usedEvidence || []).map((u) => ({
      ...clone(u),
      present: typeof u.quote === 'string' && !!u.quote.trim() && chapter.body.includes(u.quote),
    }));
    for (const u of usage) {
      if (!u.present)
        checks.push({
          kind: 'citation_not_in_text',
          factId: u.factId,
          detail: 'The recorded citation quote is no longer in the saved chapter.',
        });
      if (!pinned?.facts.some((f) => f.id === u.factId))
        checks.push({
          kind: 'unknown_citation',
          factId: u.factId,
          detail: 'The citation is not backed by the saved chapter source.',
        });
    }
    const latest = await chapterEvidence(current, task);
    if (pinned && latest.digest !== pinned.digest)
      checks.push({
        kind: 'source_changed',
        detail:
          'Current adopted sources differ from the chapter sources. Compare them without silently replacing history.',
      });
    const facts = (snapshot) =>
      snapshot
        ? [...snapshot.facts, ...snapshot.cautions].map((f) => ({
            ...clone(f),
            flags: [
              ...new Set([...f.flags, ...(f.validUntil && f.validUntil < asOf ? ['expired'] : [])]),
            ],
          }))
        : [];
    items.push({
      chapterId: task.id,
      title: chapter.title,
      pinned: pinned
        ? {
            digest: pinned.digest,
            state: pinned.state,
            facts: facts(pinned),
            requirements: pinned.requirements,
          }
        : null,
      current: {
        digest: latest.digest,
        state: latest.state,
        facts: facts(latest),
        requirements: latest.requirements,
      },
      usage,
      checks,
    });
  }
  const peers = items.flatMap((item) =>
    item.usage
      .filter((u) => u.present)
      .map((u) => ({
        chapterId: item.chapterId,
        title: item.title,
        quote: u.quote,
        fact: item.pinned?.facts.find((f) => f.id === u.factId) || null,
      })),
  );
  const out = new Map();
  for (const item of items) {
    const content = {
      schema: 1,
      asOf,
      ...item,
      otherClaims: peers.filter((c) => c.chapterId !== item.chapterId),
    };
    if (bytes(content) > budget)
      throw new Error(
        '\u4f01\u4e1a\u8bc1\u636e\u5ba1\u6838\u4e0a\u4e0b\u6587\u8d85\u51fa\u9884\u7b97\uff0c\u8bf7\u62c6\u5206\u7ae0\u8282\u6216\u7f29\u5c0f\u8bc1\u636e\u9009\u7528\uff1b\u672a\u622a\u65ad\u539f\u6587',
      );
    out.set(item.chapterId, { ...content, digest: await digest(content) });
  }
  return out;
}
export function reviewFact(input, id) {
  return [
    ...(input.pinned?.facts || []),
    ...(input.current?.facts || []),
    ...input.otherClaims.map((c) => c.fact).filter(Boolean),
  ].find((f) => f.id === id);
}
export function validateReviewEvidence(value, input, markdown) {
  if (value.evidenceDigest !== input.digest)
    throw new Error('Review enterprise evidence digest differs from the pinned audit input');
  for (const finding of value.findings) {
    if (
      !Array.isArray(finding.evidenceIds) ||
      new Set(finding.evidenceIds).size !== finding.evidenceIds.length ||
      finding.evidenceIds.some((id) => !reviewFact(input, id))
    )
      throw new Error('Review cites a foreign enterprise fact');
    if (
      !Array.isArray(finding.relatedChapterIds) ||
      new Set(finding.relatedChapterIds).size !== finding.relatedChapterIds.length ||
      finding.relatedChapterIds.some((id) => !input.otherClaims.some((c) => c.chapterId === id))
    )
      throw new Error('Review cites a foreign chapter');
    if (
      ['evidence_expired', 'evidence_conflict', 'evidence_mismatch', 'evidence_changed'].includes(
        finding.category,
      ) &&
      !finding.evidenceIds.length &&
      (input.pinned?.facts.length || 0) + input.current.facts.length > 0
    )
      throw new Error('Evidence finding must identify the inspected source');
    if (
      EVIDENCE_CATEGORIES.includes(finding.category) &&
      finding.quote &&
      !markdown.includes(finding.quote)
    )
      throw new Error('Evidence review quote is not in the saved chapter');
  }
}
/** Structural notices supplement model findings; none claims semantic compliance. */
export function structuralEvidenceFindings(input, markdown) {
  const findings = [],
    add = (category, title, detail, quote = '', ids = []) =>
      findings.push({
        severity: 'warning',
        category,
        title,
        detail,
        quote,
        requirementIds: [],
        evidenceIds: ids,
        relatedChapterIds: [],
        suggestion:
          '\u6838\u5bf9\u4f01\u4e1a\u8d44\u6599\u548c\u5f53\u524d\u6b63\u6587\uff0c\u786e\u8ba4\u6765\u6e90\u540e\u751f\u6210\u5355\u7ae0\u4fee\u8ba2\u5019\u9009\u7a3f\u5e76\u91cd\u65b0\u5ba1\u6838\u3002',
        origin: 'source-check',
      });
  for (const check of input.checks) {
    if (check.kind === 'no_source_record')
      add(
        'evidence_missing',
        '\u672c\u7ae0\u5c1a\u65e0\u4f01\u4e1a\u6765\u6e90\u8bb0\u5f55',
        '\u6b64\u7ae0\u6ca1\u6709\u4fdd\u5b58\u4f01\u4e1a\u8bc1\u636e\u5feb\u7167\u3002\u4e0d\u8865\u9020\u5386\u53f2\u5f15\u7528\uff1b\u6a21\u578b\u5c06\u8bc6\u522b\u5b9e\u9645\u54ea\u4e9b\u4f01\u4e1a\u9648\u8ff0\u9700\u8981\u8bc1\u660e\u3002',
      );
    else if (check.kind === 'snapshot_unavailable')
      add(
        'evidence_missing',
        '\u672c\u7ae0\u539f\u8bc1\u636e\u5feb\u7167\u4e0d\u53ef\u6838\u5bf9',
        '\u539f\u8bc1\u636e\u5feb\u7167\u7f3a\u5931\u6216\u5b8c\u6574\u6027\u6821\u9a8c\u672a\u901a\u8fc7\uff0c\u6b63\u6587\u4fdd\u7559\uff0c\u4e0d\u80fd\u636e\u6b64\u786e\u8ba4\u4f01\u4e1a\u4e8b\u5b9e\u3002',
      );
    else if (check.kind === 'citation_not_in_text' || check.kind === 'unknown_citation')
      add(
        'evidence_mismatch',
        '\u5df2\u8bb0\u5f55\u5f15\u7528\u4e0e\u5f53\u524d\u6b63\u6587\u6216\u6765\u6e90\u4e0d\u4e00\u81f4',
        '\u6b63\u6587\u53ef\u80fd\u5728\u751f\u6210\u540e\u88ab\u4fee\u6539\uff0c\u6216\u539f\u5f15\u7528\u672a\u8fde\u63a5\u6709\u6548\u5feb\u7167\u3002\u8bf7\u4f9d\u5f53\u524d\u6b63\u6587\u91cd\u65b0\u6838\u5bf9\u3002',
        '',
        reviewFact(input, check.factId) ? [check.factId] : [],
      );
    else if (check.kind === 'source_changed')
      add(
        'evidence_changed',
        '\u672c\u7ae0\u4f7f\u7528\u7684\u8d44\u6599\u4e0e\u5f53\u524d\u9009\u7528\u4e0d\u540c',
        '\u7ae0\u8282\u4fdd\u7559\u539f\u6765\u6e90\u7248\u672c\uff0c\u5f53\u524d\u9009\u7528\u6216\u91c7\u7eb3\u5df2\u66f4\u65b0\u3002\u8bf7\u6838\u5bf9\u662f\u5426\u9700\u8981\u4f7f\u7528\u65b0\u8bc1\u636e\u4fee\u8ba2\u672c\u7ae0\uff0c\u4e0d\u81ea\u52a8\u66ff\u6362\u5386\u53f2\u6b63\u6587\u3002',
        '',
        input.pinned?.facts.map((f) => f.id) || [],
      );
  }
  for (const u of input.usage.filter((u) => u.present)) {
    const f = input.pinned?.facts.find((f) => f.id === u.factId);
    if (f?.flags.includes('expired'))
      add(
        'evidence_expired',
        '\u5f15\u7528\u8bc1\u660e\u5df2\u8d85\u8fc7\u6709\u6548\u671f',
        f.subject +
          ' / ' +
          f.attribute +
          '\uff0c\u6709\u6548\u671f\u81f3 ' +
          f.validUntil +
          '\u3002\u8bf7\u6838\u5bf9\u6b63\u6587\u662f\u5426\u4ecd\u5c06\u5b83\u5f53\u4f5c\u5f53\u524d\u6709\u6548\u8bc1\u660e\u3002',
        u.quote,
        [f.id],
      );
  }
  return findings;
}
