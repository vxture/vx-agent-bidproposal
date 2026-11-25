import type { AssistantClient } from "@bidproposal/shared/presentation";
async function request(path: string, body?: unknown) {
  const response = await fetch("/api/workbench/assistant" + path, {
    credentials: "same-origin",
    cache: "no-store",
    ...(body
      ? {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });
  const value = await response.json();
  if (!response.ok)
    throw Error(
      response.status === 401
        ? "\u8bf7\u91cd\u65b0\u767b\u5f55\u540e\u7ee7\u7eed\u3002"
        : response.status === 429
          ? "\u8bf7\u6c42\u8f83\u9891\u7e41\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002"
          : response.status === 409
            ? "\u4f1a\u8bdd\u5df2\u53d8\u5316\uff0c\u8bf7\u91cd\u65b0\u6253\u5f00\u540e\u7ee7\u7eed\uff1b\u8f93\u5165\u5df2\u4fdd\u7559\u3002"
            : "\u52a9\u624b\u6682\u65f6\u65e0\u6cd5\u56de\u7b54\uff1b\u8f93\u5165\u5df2\u4fdd\u7559\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002",
    );
  return value;
}
export const assistantClient: AssistantClient = {
  list: async () => (await request("")).items,
  get: (id) => request("/" + id),
  send: (input) => request("", input),
  archive: (id, revision) => request("/" + id + "/archive", { revision }),
};
