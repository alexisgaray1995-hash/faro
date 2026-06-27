// Only allow relative in-app paths as a post-login redirect target. Rejects
// absolute URLs and protocol-relative ("//evil.com") to prevent open redirects.
export const safeNext = (next: unknown): string =>
  typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
    ? next
    : "/panel";
