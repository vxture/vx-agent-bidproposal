/**
 * @package @bidproposal/app
 * @layer Presentation
 * @category Entry
 * @author AI-Generated
 * @date 2026-11-24
 */
import { safeReturnTo } from "../auth/lib/return-to";
import type { AccessState } from "./types";

export type EntryLocale = "zh-CN" | "en";
export type EntryKind = "signin" | "checking" | "subscription" | "expired" | "restricted" |
  "unassigned" | "access-unavailable" | "unavailable" | "inactive" | "no-workspace" |
  "not-found" | "error";

// --- Localized status content ----------------------------------------------

export const ENTRY_COPY = {
  "zh-CN": {
    signin: { title: "\u6807\u4e66\u65b9\u6848\u667a\u80fd\u4f53", note: "\u4f7f\u7528\u5e73\u53f0\u8d26\u53f7\u5b89\u5168\u767b\u5f55", action: "\u7ee7\u7eed\u767b\u5f55" },
    checking: { title: "\u6b63\u5728\u786e\u8ba4\u4f7f\u7528\u6743\u9650", note: "\u4f7f\u7528\u5e73\u53f0\u8d26\u53f7\u5b89\u5168\u767b\u5f55", action: "\u6838\u9a8c\u4e2d\u2026" },
    subscription: { title: "\u5c1a\u672a\u5f00\u901a", note: "\u8bf7\u8054\u7cfb\u7ba1\u7406\u5458\u5f00\u901a\uff0c\u6216\u7531\u6709\u6743\u9650\u7684\u4eba\u5458\u524d\u5f80\u5f00\u901a\u3002", action: "\u91cd\u65b0\u68c0\u67e5" },
    expired: { title: "\u8ba2\u9605\u9700\u8981\u7eed\u8ba2", note: "\u8bf7\u524d\u5f80\u7eed\u8ba2\uff0c\u6216\u8054\u7cfb\u7ba1\u7406\u5458\u5904\u7406\u3002", action: "\u91cd\u65b0\u68c0\u67e5" },
    restricted: { title: "\u5f53\u524d\u8ba2\u9605\u6682\u4e0d\u53ef\u7528", note: "\u8bf7\u8054\u7cfb\u7ba1\u7406\u5458\u786e\u8ba4\u8ba2\u9605\u72b6\u6001\u3002", action: "\u91cd\u65b0\u68c0\u67e5" },
    unassigned: { title: "\u5c1a\u672a\u5206\u914d\u4f7f\u7528\u89d2\u8272", note: "\u8bf7\u8054\u7cfb\u7ba1\u7406\u5458\u4e3a\u4f60\u5206\u914d\u4f7f\u7528\u89d2\u8272\u3002", action: "\u91cd\u65b0\u68c0\u67e5" },
    "access-unavailable": { title: "\u6682\u65f6\u65e0\u6cd5\u786e\u8ba4\u4f7f\u7528\u6743\u9650", note: "\u8bf7\u7a0d\u540e\u91cd\u65b0\u68c0\u67e5\u3002", action: "\u91cd\u65b0\u68c0\u67e5" },
    unavailable: { title: "\u6682\u65f6\u65e0\u6cd5\u8fde\u63a5", note: "\u8bf7\u7a0d\u540e\u91cd\u8bd5\uff0c\u6216\u8054\u7cfb\u670d\u52a1\u652f\u6301\u3002", action: "\u91cd\u65b0\u68c0\u67e5" },
    inactive: { title: "\u5f53\u524d\u8d26\u53f7\u4e0d\u53ef\u7528", note: "\u8bf7\u8054\u7cfb\u7ba1\u7406\u5458\u786e\u8ba4\u8d26\u53f7\u72b6\u6001\u3002", action: "\u91cd\u65b0\u68c0\u67e5" },
    "no-workspace": { title: "\u5c1a\u672a\u9009\u62e9\u5de5\u4f5c\u533a", note: "\u8bf7\u5728\u5e73\u53f0\u9009\u62e9\u5de5\u4f5c\u533a\u540e\u91cd\u65b0\u68c0\u67e5\u3002", action: "\u91cd\u65b0\u68c0\u67e5" },
    "not-found": { title: "\u9875\u9762\u4e0d\u5b58\u5728", note: "\u94fe\u63a5\u53ef\u80fd\u5df2\u5931\u6548\uff0c\u8bf7\u8fd4\u56de\u4ea7\u54c1\u5165\u53e3\u3002", action: "\u8fd4\u56de\u9996\u9875" },
    error: { title: "\u9875\u9762\u6682\u4e0d\u53ef\u7528", note: "\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002", action: "\u91cd\u8bd5" },
  },
  en: {
    signin: { title: "Proposal Writing Agent", note: "Sign in securely with your platform account", action: "Continue to sign in" },
    checking: { title: "Checking your access", note: "Sign in securely with your platform account", action: "Checking\u2026" },
    subscription: { title: "Not activated yet", note: "Contact your administrator or ask an authorized person to activate access.", action: "Check again" },
    expired: { title: "Subscription expired", note: "Renew your subscription or contact your administrator.", action: "Check again" },
    restricted: { title: "Subscription unavailable", note: "Contact your administrator to confirm the subscription status.", action: "Check again" },
    unassigned: { title: "No role assigned yet", note: "Contact your administrator to assign you a role.", action: "Check again" },
    "access-unavailable": { title: "Unable to confirm access", note: "Please check again in a moment.", action: "Check again" },
    unavailable: { title: "Unable to connect", note: "Try again later or contact support.", action: "Check again" },
    inactive: { title: "Account unavailable", note: "Contact your administrator to confirm your account status.", action: "Check again" },
    "no-workspace": { title: "No workspace selected", note: "Select a workspace on the platform, then check again.", action: "Check again" },
    "not-found": { title: "Page not found", note: "This link may have expired. Return to the product entry.", action: "Back to home" },
    error: { title: "Page unavailable", note: "Please try again in a moment.", action: "Try again" },
  },
} satisfies Record<EntryLocale, Record<EntryKind, { title: string; note: string; action: string }>>;

// --- Authority mapping and controlled navigation ---------------------------

/** Map only explicit authority facts; cancelled/suspended are not expiry. */
export function entryKindFor(state: AccessState): EntryKind {
  switch (state.status) {
    case "anonymous": return "signin";
    case "unassigned": return "unassigned";
    case "unavailable": return "access-unavailable";
    case "unconfigured": return "unavailable";
    case "inactive-account": return "inactive";
    case "no-workspace": return "no-workspace";
    case "open": return "checking";
    case "authenticated": {
      if (state.gates.productAccess) return "checking";
      if (state.entitlement.status === "expired") return "expired";
      if (state.entitlement.status === null && state.entitlement.tier === null && !state.entitlement.bundled) return "subscription";
      return "restricted";
    }
  }
}

/** Always return from login through the authority gate, preserving the target. */
export function gateLoginUrl(destination: string): string {
  const target = safeReturnTo(destination);
  const gate = target === "/" || target.split(/[?#]/)[0] === "/gate"
    ? "/gate" : `/gate?from=${encodeURIComponent(target)}`;
  return `/auth/login?returnTo=${encodeURIComponent(gate)}`;
}
