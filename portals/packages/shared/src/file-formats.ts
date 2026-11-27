/** One allowlist for collection upload, preview routing and host validation. */
export const FILE_FORMATS = {
  docx: { kind: "office", editor: "word", editable: true },
  xlsx: { kind: "office", editor: "cell", editable: true },
  pptx: { kind: "office", editor: "slide", editable: true },
  pdf: { kind: "pdf", editable: false },
  md: { kind: "markdown", editable: true },
  png: { kind: "image", editable: false },
  jpg: { kind: "image", editable: false },
  jpeg: { kind: "image", editable: false },
  webp: { kind: "image", editable: false },
  gif: { kind: "image", editable: false },
} as const;
export type FileExtension = keyof typeof FILE_FORMATS;
export function fileFormat(name: string) {
  const extension = name.split(".").at(-1)?.toLowerCase() as FileExtension;
  return Object.hasOwn(FILE_FORMATS, extension) ? { extension, ...FILE_FORMATS[extension] } : undefined;
}
export const FILE_ACCEPT = Object.keys(FILE_FORMATS).map((extension) => "." + extension).join(",");
export const FILE_UPLOAD_MAX_BYTES = 20 * 1024 * 1024;
