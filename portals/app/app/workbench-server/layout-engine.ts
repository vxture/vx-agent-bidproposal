/**
 * @package @bidproposal/app
 * @layer Infrastructure
 * @category DocumentLayout
 * @author AI-Generated
 * @date 2026-11-25
 */
import { spawn } from "node:child_process";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { LayoutOutput, LayoutFields } from "@vxture/ruyin-node-runtime";

// --- Bounded single-engine dispatch --------------------------------------
let queue: Promise<unknown> = Promise.resolve();
let waiting = 0;
export function serverLayout(
  docx: Uint8Array,
  template?: Buffer,
  fields?: LayoutFields,
): Promise<LayoutOutput> {
  if (waiting >= 16)
    return Promise.reject(Error("The layout engine is busy; retry shortly"));
  waiting++;
  const pending = queue.then(() => layout(docx, template, fields));
  queue = pending.catch(() => undefined);
  return pending.finally(() => {
    waiting--;
  });
}
async function layout(
  docx: Uint8Array,
  template?: Buffer,
  fields?: LayoutFields,
): Promise<LayoutOutput> {
  const root = await mkdtemp(join(tmpdir(), "bid-layout-"));
  try {
    await writeFile(join(root, "input.docx"), docx, { mode: 0o600 });
    if (template)
      await writeFile(join(root, "template.docx"), template, { mode: 0o600 });
    if (fields)
      await writeFile(join(root, "fields.json"), JSON.stringify(fields), {
        mode: 0o600,
      });
    await new Promise<void>((resolve, reject) => {
      const child = spawn(
        "/usr/bin/python3",
        ["-I", "-B", join(process.cwd(), "document-engine/layout.py"), root],
        {
          detached: true,
          windowsHide: true,
          stdio: ["ignore", "ignore", "pipe"],
          env: {
            NODE_ENV: "production",
            PATH: "/usr/bin:/bin",
            HOME: root,
            LANG: "C.UTF-8",
            PYTHONIOENCODING: "utf-8",
          },
        },
      );
      let diagnostic = "",
        timedOut = false;
      child.stderr.setEncoding("utf8");
      child.stderr.on("data", (chunk: string) => {
        if (diagnostic.length < 3000) diagnostic += chunk;
      });
      const timer = setTimeout(() => {
        timedOut = true;
        if (child.pid) {
          try {
            process.kill(-child.pid, "SIGKILL");
          } catch {
            child.kill("SIGKILL");
          }
        }
      }, 180_000);
      child.on("error", () => {
        clearTimeout(timer);
        reject(Error("The document layout engine is unavailable"));
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        if (code === 0) resolve();
        else {
          console.error(
            "[bid-layout] engine refused document",
            timedOut
              ? "timeout"
              : diagnostic.replaceAll(root, "[job]").slice(-1000),
          );
          reject(
            Error(
              timedOut
                ? "Document layout timed out; the saved manuscript is preserved"
                : "Document layout failed; verify the template and retry",
            ),
          );
        }
      });
    });
    const [docxBytes, pdfBytes, metadata] = await Promise.all([
      readFile(join(root, "output.docx")),
      readFile(join(root, "output.pdf")),
      readFile(join(root, "result.json"), "utf8"),
    ]);
    const { pages } = JSON.parse(metadata) as { pages: number };
    if (
      docxBytes.length > 20 * 1024 * 1024 ||
      pdfBytes.length > 20 * 1024 * 1024 ||
      !pdfBytes.subarray(0, 5).equals(Buffer.from("%PDF-")) ||
      !Number.isSafeInteger(pages) ||
      pages < 1 ||
      pages > 10000
    )
      throw Error("Invalid layout output");
    return {
      docx: docxBytes,
      pdf: pdfBytes,
      pages,
      engine: "LibreOffice Writer",
    };
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
