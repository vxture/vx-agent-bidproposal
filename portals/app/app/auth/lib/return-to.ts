// returnTo whitelist (080-rp section 2.5 #7): only same-origin relative paths are
// allowed, to prevent open redirects. Anything else falls back to "/".

export function safeReturnTo(raw: string | null | undefined): string {
  if (!raw) return "/";
  // Must be a root-relative path, not a scheme-relative (`//host`) or absolute URL.
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return "/";
  // Reject control chars / backslashes that some browsers normalize to //.
  if (/[\x00-\x1f\\]/.test(raw)) return "/";
  return raw;
}
