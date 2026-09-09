import Anthropic from "@anthropic-ai/sdk";

/// The app runs with or without a Claude API key.
///
/// With a key, the inbox extractor and Ask the Course run on Claude. Without
/// one, both fall back to a deterministic parser over the same records — less
/// clever, but real, and the UI says which one answered rather than dressing
/// the fallback up as AI.

export const MODEL = "claude-opus-5";

export function aiEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let client: Anthropic | null = null;

export function anthropic(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

export type Engine = "claude" | "fallback";
