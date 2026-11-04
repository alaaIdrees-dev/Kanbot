/** Only same-app paths are allowed, to prevent open redirects via `?redirect=`. */
export function safeRedirect(value: string | null, fallback = "/projects"): string {
  if (value && value.startsWith("/") && !value.startsWith("//")) return value;
  return fallback;
}
