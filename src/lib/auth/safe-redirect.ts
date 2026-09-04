export function safeRedirectPath(value: string | undefined, fallback = "/projects") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  try {
    const url = new URL(value, "https://taskflow.local");
    return url.origin === "https://taskflow.local"
      ? `${url.pathname}${url.search}${url.hash}`
      : fallback;
  } catch {
    return fallback;
  }
}
