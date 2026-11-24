/**
 * @package @bidproposal/workbench
 * @layer Presentation
 * @category Business
 * @author AI-Generated
 * @date 2026-11-25
 */
import { DocumentError } from './errors.mjs';
export { DocumentError };
export class DraftSession {
  constructor(bridge) {
    this.bridge = bridge;
    this.revision = 0;
    this.saved = '';
    this.chapters = [];
    this.current = 0;
  }
  static decode(markdown) {
    if (!markdown) return [];
    const parts = markdown.split(/^<!-- bidproposal:chapter:([a-f0-9-]{36}) -->\r?\n/gm);
    if (parts[0].trim()) throw new Error('Unsupported project draft format');
    const chapters = [];
    for (let i = 1; i < parts.length; i += 2) {
      const match = /^# ([^\r\n]+)\r?\n\r?\n/.exec(parts[i + 1]);
      if (!match) throw new Error('Invalid chapter format');
      chapters.push({ id: parts[i], title: match[1], body: parts[i + 1].slice(match[0].length).trimEnd() });
    }
    if (
      !chapters.length ||
      chapters.length > 80 ||
      new Set(chapters.map((c) => c.id)).size !== chapters.length
    )
      throw new Error('Invalid chapter list');
    return chapters;
  }
  encode() {
    return this.chapters
      .map((c) => {
        if (!c.title.trim() || /[\r\n]/.test(c.title) || c.title.length > 100)
          throw new Error('A chapter title is required (up to 100 characters)');
        if (/^<!-- bidproposal:chapter:/m.test(c.body))
          throw new Error('Reserved chapter marker in content');
        return (
          '<!-- bidproposal:chapter:' +
          c.id +
          ' -->\n# ' +
          c.title.trim() +
          '\n\n' +
          c.body.trimEnd() +
          '\n'
        );
      })
      .join('\n');
  }
  get dirty() {
    try {
      return this.encode() !== this.saved;
    } catch {
      return true;
    }
  }
  async load() {
    const r = await this.bridge.request('GET', '/documents/bid_draft');
    if (!r.ok && r.status !== 404) throw new DocumentError(r);
    const md = r.ok ? r.body.markdown : '';
    const chapters = DraftSession.decode(md);
    this.chapters = chapters;
    this.saved = md;
    this.revision = r.ok ? r.body.revision : 0;
    this.current = Math.min(this.current, Math.max(0, chapters.length - 1));
  }
  add(title) {
    if (this.chapters.length >= 80) throw new Error('Chapter limit is 80');
    const c = { id: crypto.randomUUID(), title, body: '' };
    this.chapters.push(c);
    this.current = this.chapters.length - 1;
    return c;
  }
  async save() {
    const markdown = this.encode();
    if (new TextEncoder().encode(markdown).length > 1024 * 1024)
      throw new Error('Project draft exceeds 1 MiB');
    const r = await this.bridge.request('PUT', '/documents/bid_draft', {
      markdown,
      revision: this.revision,
    });
    if (!r.ok) throw new DocumentError(r);
    this.revision = r.body.revision;
    this.saved = markdown;
  }
}
