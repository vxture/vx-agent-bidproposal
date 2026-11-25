/**
 * @package @bidproposal/workbench
 * @layer Presentation
 * @category DocumentEditor
 * @author AI-Generated
 * @date 2026-11-26
 */
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import { TableKit } from '@tiptap/extension-table';

/** Local ProseMirror editor; no cloud document service or remote assets. */
export function createChapterEditor(element, markdown, onUpdate) {
  const editor = new Editor({
    element,
    extensions: [
      StarterKit.configure({ link: { openOnClick: false }, heading: { levels: [2, 3, 4] } }),
      TableKit.configure({ table: { resizable: true } }),
      Markdown,
    ],
    content: markdown,
    contentType: 'markdown',
    editorProps: {
      attributes: {
        class: 'chapter-prose markdown-body',
        role: 'textbox',
        'aria-label': '\u7ae0\u8282\u6b63\u6587\u7f16\u8f91\u5668',
        'aria-multiline': 'true',
        spellcheck: 'false',
      },
    },
    onUpdate: () => onUpdate(editor.getMarkdown()),
  });
  return {
    markdown: () => editor.getMarkdown(),
    selectedText: () => {
      const { from, to } = editor.state.selection;
      return editor.state.doc.textBetween(from, to, '\n');
    },
    command(action) {
      const chain = editor.chain().focus();
      if (action === 'paragraph') chain.setParagraph().run();
      else if (/^h[234]$/.test(action)) chain.toggleHeading({ level: Number(action[1]) }).run();
      else if (action === 'bold') chain.toggleBold().run();
      else if (action === 'italic') chain.toggleItalic().run();
      else if (action === 'bullet') chain.toggleBulletList().run();
      else if (action === 'ordered') chain.toggleOrderedList().run();
      else if (action === 'quote') chain.toggleBlockquote().run();
      else if (action === 'table') chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
      else if (action === 'row') chain.addRowAfter().run();
      else if (action === 'column') chain.addColumnAfter().run();
      else if (action === 'undo') chain.undo().run();
      else if (action === 'redo') chain.redo().run();
    },
    focus: () => editor.commands.focus(),
    destroy: () => editor.destroy(),
  };
}
