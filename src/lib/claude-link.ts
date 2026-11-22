/** Opens a new Claude chat with the question already filled in. */
export function claudeLink(prompt: string) {
  return `https://claude.ai/new?q=${encodeURIComponent(prompt)}`;
}
