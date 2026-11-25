/**
 * @package @bidproposal/app
 * @layer Presentation
 * @category Entry
 * @author AI-Generated
 * @date 2026-11-24
 */
import { safeReturnTo } from "../auth/lib/return-to";
import { BRAND } from "@bidproposal/shared/brand";
import type { AccessState } from "./types";

export type EntryLocale = "zh-CN" | "en";
export type EntryKind = "signin" | "checking" | "subscription" | "expired" | "restricted" |
  "unassigned" | "access-unavailable" | "unavailable" | "inactive" | "no-workspace" |
  "not-found" | "error";

// --- Localized status content ----------------------------------------------

type EntryCopy = { title: string; note: string; action: string };
type EntryText = readonly [title: string, note: string, action: string];

const ENTRY_TEXT: Record<EntryKind, Record<EntryLocale, EntryText>> = {
  signin: {
    "zh-CN": [BRAND.fullName,"\u4f7f\u7528\u5e73\u53f0\u8d26\u53f7\u5b89\u5168\u767b\u5f55","\u7ee7\u7eed\u767b\u5f55"],
    en: [`${BRAND.displayName} - Proposal Intelligence Agent`,"Sign in securely with your platform account","Continue to sign in"],
  },
  checking: {
    "zh-CN": ["\u6b63\u5728\u786e\u8ba4\u4f7f\u7528\u6743\u9650","\u4f7f\u7528\u5e73\u53f0\u8d26\u53f7\u5b89\u5168\u767b\u5f55","\u6838\u9a8c\u4e2d\u2026"],
    en: ["Checking your access","Sign in securely with your platform account","Checking\u2026"],
  },
  subscription: {
    "zh-CN": ["\u5c1a\u672a\u5f00\u901a","\u8bf7\u8054\u7cfb\u7ba1\u7406\u5458\u5f00\u901a\uff0c\u6216\u7531\u6709\u6743\u9650\u7684\u4eba\u5458\u524d\u5f80\u5f00\u901a\u3002","\u91cd\u65b0\u68c0\u67e5"],
    en: ["Not activated yet","Contact your administrator or ask an authorized person to activate access.","Check again"],
  },
  expired: {
    "zh-CN": ["\u8ba2\u9605\u9700\u8981\u7eed\u8ba2","\u8bf7\u524d\u5f80\u7eed\u8ba2\uff0c\u6216\u8054\u7cfb\u7ba1\u7406\u5458\u5904\u7406\u3002","\u91cd\u65b0\u68c0\u67e5"],
    en: ["Subscription expired","Renew your subscription or contact your administrator.","Check again"],
  },
  restricted: {
    "zh-CN": ["\u5f53\u524d\u8ba2\u9605\u6682\u4e0d\u53ef\u7528","\u8bf7\u8054\u7cfb\u7ba1\u7406\u5458\u786e\u8ba4\u8ba2\u9605\u72b6\u6001\u3002","\u91cd\u65b0\u68c0\u67e5"],
    en: ["Subscription unavailable","Contact your administrator to confirm the subscription status.","Check again"],
  },
  unassigned: {
    "zh-CN": ["\u5c1a\u672a\u5206\u914d\u4f7f\u7528\u89d2\u8272","\u8bf7\u8054\u7cfb\u7ba1\u7406\u5458\u4e3a\u4f60\u5206\u914d\u4f7f\u7528\u89d2\u8272\u3002","\u91cd\u65b0\u68c0\u67e5"],
    en: ["No role assigned yet","Contact your administrator to assign you a role.","Check again"],
  },
  "access-unavailable": {
    "zh-CN": ["\u6682\u65f6\u65e0\u6cd5\u786e\u8ba4\u4f7f\u7528\u6743\u9650","\u8bf7\u7a0d\u540e\u91cd\u65b0\u68c0\u67e5\u3002","\u91cd\u65b0\u68c0\u67e5"],
    en: ["Unable to confirm access","Please check again in a moment.","Check again"],
  },
  unavailable: {
    "zh-CN": ["\u6682\u65f6\u65e0\u6cd5\u8fde\u63a5","\u8bf7\u7a0d\u540e\u91cd\u8bd5\uff0c\u6216\u8054\u7cfb\u670d\u52a1\u652f\u6301\u3002","\u91cd\u65b0\u68c0\u67e5"],
    en: ["Unable to connect","Try again later or contact support.","Check again"],
  },
  inactive: {
    "zh-CN": ["\u5f53\u524d\u8d26\u53f7\u4e0d\u53ef\u7528","\u8bf7\u8054\u7cfb\u7ba1\u7406\u5458\u786e\u8ba4\u8d26\u53f7\u72b6\u6001\u3002","\u91cd\u65b0\u68c0\u67e5"],
    en: ["Account unavailable","Contact your administrator to confirm your account status.","Check again"],
  },
  "no-workspace": {
    "zh-CN": ["\u5c1a\u672a\u9009\u62e9\u5de5\u4f5c\u533a","\u8bf7\u5728\u5e73\u53f0\u9009\u62e9\u5de5\u4f5c\u533a\u540e\u91cd\u65b0\u68c0\u67e5\u3002","\u91cd\u65b0\u68c0\u67e5"],
    en: ["No workspace selected","Select a workspace on the platform, then check again.","Check again"],
  },
  "not-found": {
    "zh-CN": ["\u9875\u9762\u4e0d\u5b58\u5728","\u94fe\u63a5\u53ef\u80fd\u5df2\u5931\u6548\uff0c\u8bf7\u8fd4\u56de\u4ea7\u54c1\u5165\u53e3\u3002","\u8fd4\u56de\u9996\u9875"],
    en: ["Page not found","This link may have expired. Return to the product entry.","Back to home"],
  },
  error: {
    "zh-CN": ["\u9875\u9762\u6682\u4e0d\u53ef\u7528","\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002","\u91cd\u8bd5"],
    en: ["Page unavailable","Please try again in a moment.","Try again"],
  },
};

function localizedCopy(locale: EntryLocale): Record<EntryKind, EntryCopy> {
  const entries = Object.entries(ENTRY_TEXT).map(([kind, translations]) => {
    const [title, note, action] = translations[locale];
    return [kind, { title, note, action }];
  });
  // ENTRY_TEXT exhaustively defines the keys reconstructed by Object.entries.
  return Object.fromEntries(entries) as Record<EntryKind, EntryCopy>;
}

export const ENTRY_COPY = { "zh-CN": localizedCopy("zh-CN"), en: localizedCopy("en") };

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
