/**
 * Reads an environment variable and strips trailing inline `# comment` annotations
 * (such as `BETA_UNLOCK_MODE=instant  # options: ...`) safely.
 */
export function readCleanEnv(name: string): string {
  const raw = process.env[name];
  if (!raw) return "";
  return raw.replace(/\s+#.*$/, "").trim();
}
