/**
 * @package @bidproposal/workbench
 * @layer Presentation
 * @category Business
 * @author AI-Generated
 * @date 2026-11-25
 */
import { DocumentError } from './errors.mjs';
import { checkMatrixSources, rowBinding } from './source-verification.mjs';
export const MATRIX_BYTE_LIMIT = 900000;
export function parseCandidates(text) {
  if (typeof text !== 'string' || text.length > 500000) throw new Error('Invalid analysis result');
  const raw = text
    .trim()
    .replace(/^```(?:json)?\s*/, '')
    .replace(/```$/, '');
  const parsed = JSON.parse(raw);
  const rows = parsed.requirements;
  if (!Array.isArray(rows) || !rows.length || rows.length > 300)
    throw new Error('Expected 1-300 requirements');
  return rows.map((r) => {
    if (!r || !['commercial', 'technical'].includes(r.category))
      throw new Error('Invalid requirement category');
    for (const k of ['text', 'quote', 'location'])
      if (typeof r[k] !== 'string' || !r[k].trim() || r[k].length > 4000)
        throw new Error('Missing requirement evidence');
    return {
      id: crypto.randomUUID(),
      category: r.category,
      text: r.text.trim(),
      quote: r.quote.trim(),
      location: r.location.trim(),
      origin: 'ai',
      confirmed: false,
    };
  });
}
const cell = (s) =>
  String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('|', '&#124;')
    .replaceAll('\r', '')
    .replaceAll('\n', '&#10;');
const uncell = (s) =>
  s.replaceAll('&#10;', '\n').replaceAll('&#124;', '|').replaceAll('&amp;', '&');
export class Requirements {
  constructor(bridge) {
    this.bridge = bridge;
    this.rows = [];
    this.revision = 0;
    this.saved = '';
    this.sourceProblems = new Map();
    this.sourceBindings = new Map();
    this.unresolvedSources = [];
  }
  encode() {
    const extended = this.rows.some((r) => r.evidence);
    const markdown =
      '# Bid requirements\n\n| ID | Category | Requirement | Source quote | Location | Origin | Confirmed |' +
      (extended ? ' Evidence |' : '') +
      '\n| --- | --- | --- | --- | --- | --- | --- |' +
      (extended ? ' --- |' : '') +
      '\n' +
      this.rows
        .map((r) => {
          if (
            !/^[A-Za-z0-9_-]{1,80}$/.test(r.id) ||
            typeof r.text !== 'string' ||
            !r.text.trim() ||
            r.text.length > 4000 ||
            !['commercial', 'technical'].includes(r.category) ||
            !['ai', 'manual'].includes(r.origin) ||
            ['quote', 'location'].some((k) => typeof r[k] !== 'string' || r[k].length > 4000)
          )
            throw new Error('Invalid requirement');
          return (
            '| ' +
            [
              r.id,
              r.category,
              r.text,
              r.quote,
              r.location,
              r.origin,
              r.confirmed ? 'yes' : 'no',
              ...(extended ? [r.evidence ? JSON.stringify(r.evidence) : ''] : []),
            ]
              .map(cell)
              .join(' | ') +
            ' |'
          );
        })
        .join('\n') +
      '\n';
    if (new Set(this.rows.map((r) => r.id)).size !== this.rows.length)
      throw new Error('Duplicate requirement ID');
    if (
      new TextEncoder().encode(JSON.stringify({ markdown, revision: this.revision })).byteLength >
      MATRIX_BYTE_LIMIT
    )
      throw new Error(
        '\u9700\u6c42\u77e9\u9635\u8d85\u51fa\u4fdd\u5b58\u5bb9\u91cf\uff0c\u672a\u622a\u65ad\u6216\u4e22\u5f03\u4efb\u4f55\u884c',
      );
    return markdown;
  }
  get dirty() {
    try {
      return this.encode() !== this.saved;
    } catch {
      return true;
    }
  }
  async load() {
    const r = await this.bridge.request('GET', '/documents/bid_requirements');
    if (!r.ok && r.status !== 404) throw new DocumentError(r);
    const md = r.ok ? r.body.markdown : '';
    const rows = [];
    if (md) {
      if (!md.startsWith('# Bid requirements\n')) throw new Error('Unsupported matrix format');
      for (const line of md.split('\n').slice(4)) {
        if (!line.trim()) continue;
        const v = line
          .split('|')
          .slice(1, -1)
          .map((x) => uncell(x.trim()));
        if (
          ![7, 8].includes(v.length) ||
          !['commercial', 'technical'].includes(v[1]) ||
          !['ai', 'manual'].includes(v[5]) ||
          !['yes', 'no'].includes(v[6])
        )
          throw new Error('Invalid matrix row');
        rows.push({
          id: v[0],
          category: v[1],
          text: v[2],
          quote: v[3],
          location: v[4],
          origin: v[5],
          confirmed: v[6] === 'yes',
          ...(v[7] ? { evidence: JSON.parse(v[7]) } : {}),
        });
      }
    }
    const old = this.rows;
    this.rows = rows;
    try {
      this.encode();
    } catch (error) {
      this.rows = old;
      throw error;
    }
    this.revision = r.ok ? r.body.revision : 0;
    this.saved = md || this.encode();
    await this.recheck();
  }
  add(r) {
    const old = this.rows;
    this.rows = [
      ...old,
      {
        id: crypto.randomUUID(),
        category: 'technical',
        text: '',
        quote: '',
        location: '',
        ...r,
        origin: 'manual',
        confirmed: false,
      },
    ];
    try {
      this.encode();
    } catch (e) {
      this.rows = old;
      throw e;
    }
  }
  adopt(candidates) {
    const keys = new Set(this.rows.map((r) => JSON.stringify([r.category, r.text, r.quote]))),
      sources = new Set(this.rows.map((r) => r.evidence?.candidateId).filter(Boolean));
    const added = [];
    for (const r of candidates) {
      const key = JSON.stringify([r.category, r.text, r.quote]);
      if (
        keys.has(key) &&
        r.evidence &&
        this.rows.some(
          (old) =>
            old.category === r.category &&
            old.text === r.text &&
            old.quote === r.quote &&
            old.evidence &&
            old.evidence.reviewId !== r.evidence.reviewId &&
            this.sourceProblems.has(old.id),
        )
      )
        throw new Error(
          '\u5df2\u6709\u76f8\u540c\u9700\u6c42\u7684\u65e7\u6838\u9a8c\u8bb0\u5f55\uff0c\u8bf7\u5148\u5728\u9700\u6c42\u786e\u8ba4\u4e2d\u590d\u6838\uff0c\u672a\u8986\u76d6\u539f\u884c',
        );
      if (!keys.has(key) && (!r.evidence || !sources.has(r.evidence.candidateId))) {
        keys.add(key);
        if (r.evidence) sources.add(r.evidence.candidateId);
        added.push({ ...r, id: r.id || crypto.randomUUID(), origin: 'ai', confirmed: false });
      }
    }
    const old = this.rows;
    this.rows = [...old, ...added];
    try {
      this.encode();
    } catch (e) {
      this.rows = old;
      throw e;
    }
    return added.length;
  }
  edit(id, patch) {
    const r = this.rows.find((r) => r.id === id);
    if (!r) throw new Error('Unknown requirement');
    for (const key of Object.keys(patch))
      if (!['category', 'text', 'quote', 'location'].includes(key))
        throw new Error('Invalid requirement edit');
    Object.assign(r, patch, { confirmed: false });
    if (r.evidence) {
      r.evidence = { ...r.evidence, status: 'changed' };
      this.sourceProblems.set(
        id,
        '\u9700\u6c42\u5df2\u4fee\u6539\uff0c\u8bf7\u91cd\u65b0\u6838\u5bf9\u6765\u6e90\u548c\u9002\u7528\u8303\u56f4',
      );
    }
  }
  async recheck() {
    this.unresolvedSources = [];
    this.sourceProblems = await checkMatrixSources(this.bridge, this.rows, {
      onUnresolved: (items) => (this.unresolvedSources = items),
    });
    this.sourceBindings = new Map();
    for (const r of this.rows)
      if (this.sourceProblems.has(r.id)) r.confirmed = false;
      else if (r.evidence) this.sourceBindings.set(r.id, rowBinding(r));
  }
  confirm(id) {
    const rows = id ? this.rows.filter((r) => r.id === id) : this.rows;
    for (const r of rows) {
      if (!r.text.trim() || !r.quote.trim() || !r.location.trim())
        throw new Error(
          '\u8bf7\u8865\u9f50\u9700\u6c42\u3001\u4f9d\u636e\u539f\u6587\u548c\u4f4d\u7f6e\u540e\u786e\u8ba4',
        );
      if (
        this.sourceProblems.has(r.id) ||
        (r.evidence &&
          (this.sourceBindings.get(r.id) !== rowBinding(r) ||
            !['verified', 'manual-reviewed'].includes(r.evidence.status)))
      )
        throw new Error(
          '\u6765\u6e90\u6216\u9700\u6c42\u5df2\u53d8\u5316\uff0c\u8bf7\u5148\u6838\u5bf9\u5f53\u524d\u4f9d\u636e\u548c\u9002\u7528\u8303\u56f4',
        );
    }
    for (const r of rows) r.confirmed = true;
  }
  async save() {
    const markdown = this.encode();
    const r = await this.bridge.request('PUT', '/documents/bid_requirements', {
      markdown,
      revision: this.revision,
    });
    if (!r.ok) throw new DocumentError(r);
    this.revision = r.body.revision;
    this.saved = markdown;
  }
}
