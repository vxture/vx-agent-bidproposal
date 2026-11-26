/** Notify recovery without retrying a rejected read or write. */
export const ACCESS_RECOVERY_EVENT = "jadera.access-recovery";
let blocked = false;
export function setWorkspaceBlocked(value: boolean) { blocked = value; }
export const productFetch: typeof fetch = async (input, init) => {
  if (blocked) throw Error("\u8bf7\u5148\u786e\u8ba4\u8d26\u53f7\u4e0e\u5de5\u4f5c\u533a\uff1b\u5f53\u524d\u5185\u5bb9\u5df2\u4fdd\u7559");
  const response = await fetch(input, init);
  if ([401, 403].includes(response.status) && typeof window !== "undefined") {
    blocked = true;
    window.dispatchEvent(new Event(ACCESS_RECOVERY_EVENT));
  }
  return response;
};
