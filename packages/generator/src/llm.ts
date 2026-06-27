import { createHash } from "node:crypto";

type ChatMsg = { role: "system" | "user"; content: string };

export interface LlmClient {
  complete(messages: ChatMsg[], opts?: { json?: boolean }): Promise<string>;
}

const hashFingerprint = (n: number): string =>
  createHash("sha256").update(String(n)).digest("hex").slice(0, 16);

let stubCounter = 0;
export const makeStubLlm = (response?: string): LlmClient => ({
  async complete() {
    stubCounter += 1;
    if (response !== undefined) return response;
    return JSON.stringify({
      premise: "A fictional confession about a small mistake that wouldn't stay small.",
      hook: "I should have left the office before the cleaning crew arrived.",
      forum_card: {
        display_title: "Confession: late night",
        fictional_handle: "throwaway_latenight",
        fictional_community_label: "confessions",
        relative_time_label: "2 hours ago",
        style_variant: "dark-card",
      },
      confession_voice: "first-person",
      story_blocks: [
        { index: 0, text: "The cleaning crew never came before midnight.", suggested_duration_s: 6 },
        { index: 1, text: "Tonight was different.", suggested_duration_s: 3 },
        { index: 2, text: "They were waiting for me.", suggested_duration_s: 7 },
      ],
      twist: "I had been the one cleaning the office for years.",
      ending_mode: "twist",
      tone: "unsettling",
      intensity: "medium",
      background_mood: "dark-hallway",
      music_mood: "low-tension",
      tts_voice: "am_michael",
      cta: "comment-your-take",
      platform_variants: { tiktok_reels: { pacing: "fast" }, youtube_shorts: { pacing: "medium" } },
      generation_prompt_version: "v1",
      freshness_fingerprint: hashFingerprint(stubCounter),
    });
  },
});

export const makeOpenAiCompatibleLlm = (
  baseUrl: string,
  apiKey: string,
  model: string
): LlmClient => ({
  async complete(messages, opts) {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        response_format: opts?.json ? { type: "json_object" } : undefined,
      }),
    });
    if (!res.ok) throw new Error(`LLM ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { choices: { message: { content: string } }[] };
    return data.choices[0]!.message.content;
  },
});
