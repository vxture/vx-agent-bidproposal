/** Read-only projection of the existing workflow log, not a new workflow verdict. */
const stages = [
  "analysis",
  "requirements",
  "planning",
  "chapters",
  "review",
  "export",
];
const labels = [
  "\u62db\u6807\u89e3\u8bfb",
  "\u9700\u6c42\u786e\u8ba4",
  "\u7f16\u5199\u89c4\u5212",
  "\u6807\u4e66\u7f16\u5199",
  "\u5ba1\u6838\u4fee\u8ba2",
  "\u6210\u679c\u5bfc\u51fa",
];
export function projectRecord(markdown: unknown) {
  if (
    typeof markdown !== "string" ||
    !markdown.startsWith("# Bid workflow\n\n")
  )
    return undefined;
  try {
    const data: unknown = JSON.parse(
      markdown.slice("# Bid workflow\n\n".length),
    );
    if (!data || typeof data !== "object" || Array.isArray(data))
      return undefined;
    const rows = Object.entries(data).map(([key, value]) => {
      if (!stages.includes(key) || !value || typeof value !== "object")
        throw Error("Invalid stage");
      const item = value as Record<string, unknown>;
      if (
        typeof item.startedAt !== "string" ||
        (item.completedAt !== undefined && typeof item.completedAt !== "string")
      )
        throw Error("Invalid timestamp");
      const start = Date.parse(item.startedAt),
        end =
          item.completedAt === undefined
            ? undefined
            : Date.parse(item.completedAt as string);
      if (
        !Number.isFinite(start) ||
        (end !== undefined && (!Number.isFinite(end) || end < start))
      )
        throw Error("Invalid timestamp");
      return { index: stages.indexOf(key), start, end };
    });
    if (!rows.length) return undefined;
    const latest = [...rows].sort(
      (a, b) => b.start - a.start || b.index - a.index,
    )[0]!;
    const completed = rows.filter((row) => row.end !== undefined).length;
    return {
      stage: labels[latest.index]!,
      stageIndex: latest.index,
      completed,
      completedStages: rows
        .filter((row) => row.end !== undefined)
        .map((row) => row.index)
        .sort((a, b) => a - b),
      recordedAt: new Date(
        Math.max(
          ...rows.flatMap((row) => [
            row.start,
            ...(row.end === undefined ? [] : [row.end]),
          ]),
        ),
      ).toISOString(),
      complete: completed === 6,
    };
  } catch {
    return undefined;
  }
}
