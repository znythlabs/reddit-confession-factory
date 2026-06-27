import { createHash } from "node:crypto";

type ChatMsg = { role: "system" | "user"; content: string };

export interface LlmClient {
  complete(messages: ChatMsg[], opts?: { json?: boolean }): Promise<string>;
}

const hashFingerprint = (n: number): string =>
  createHash("sha256").update(String(n)).digest("hex").slice(0, 16);

// ponytail: 8 rotating templates so a batch of N stories produces N distinct
// hooks / premises / twists instead of N copies of the same one. Each template
// stays inside the no-forgery guardrails (no real subreddit names, no
// engagement metrics, no impersonation patterns).
const STUB_TEMPLATES: Array<{
  premise: string; hook: string; display_title: string; handle: string; twist: string;
  story_blocks: Array<{ text: string; suggested_duration_s: number }>;
}> = [
  {
    premise: "A small lie told to a coworker starts unraveling a friendship that held up a whole team.",
    hook: "I should not have told Sam that Marcus was the one who broke the coffee machine.",
    display_title: "Confession: the coffee machine",
    handle: "throwaway_latenight",
    twist: "Marcus had broken the coffee machine, but he had also started the rumor that I broke it, six months earlier.",
    story_blocks: [
      { text: "The coffee machine had been broken for two days.", suggested_duration_s: 6 },
      { text: "Sam asked me who did it, and I lied.", suggested_duration_s: 3 },
      { text: "By Friday, the lie was the only thing holding the team together.", suggested_duration_s: 7 },
    ],
  },
  {
    premise: "A neighbor's late-night routine looked suspicious until I realized I had been the suspicious one all along.",
    hook: "I should not have started watching the man in 4B after ten p.m.",
    display_title: "Confession: 4B",
    handle: "throwaway_apartment",
    twist: "He had been watching me. He had a good reason to.",
    story_blocks: [
      { text: "The hallway light in 4B flickers at ten every night.", suggested_duration_s: 6 },
      { text: "I started checking the peephole.", suggested_duration_s: 3 },
      { text: "He was doing the same thing on his side.", suggested_duration_s: 7 },
    ],
  },
  {
    premise: "An honest mistake on a shared document triggers a small office mystery that nobody is supposed to know about.",
    hook: "I should not have fixed the typo in the shared doc.",
    display_title: "Confession: shared doc",
    handle: "throwaway_typo",
    twist: "The typo had been put there on purpose, by the same person who wrote the rest of the doc.",
    story_blocks: [
      { text: "The shared doc had a typo on line 12.", suggested_duration_s: 6 },
      { text: "I fixed it without thinking.", suggested_duration_s: 3 },
      { text: "By the next morning, three people had asked me about it.", suggested_duration_s: 7 },
    ],
  },
  {
    premise: "A returned package sits in a lobby for a week because the courier and the recipient cannot agree on who is at fault.",
    hook: "I should not have picked up the box that was not mine.",
    display_title: "Confession: the box",
    handle: "throwaway_lobby",
    twist: "The box had been sitting there for a year. The person who ordered it had moved out the day it arrived.",
    story_blocks: [
      { text: "The box had been in the lobby for a week.", suggested_duration_s: 6 },
      { text: "I picked it up because the courier was giving the concierge a hard time.", suggested_duration_s: 3 },
      { text: "I opened it. The label had my old name on it.", suggested_duration_s: 7 },
    ],
  },
  {
    premise: "A half-remembered song from a parent's car becomes the only evidence of a conversation everyone has agreed to forget.",
    hook: "I should not have started humming the song out loud.",
    display_title: "Confession: the song",
    handle: "throwaway_morning",
    twist: "My mother had been humming it for twenty years, and she had no idea where it came from either.",
    story_blocks: [
      { text: "The song came on the radio during a long drive.", suggested_duration_s: 6 },
      { text: "I hummed it for the rest of the week.", suggested_duration_s: 3 },
      { text: "Three people turned around at the coffee shop.", suggested_duration_s: 7 },
    ],
  },
  {
    premise: "A small repair request on a rental apartment turns into a slow negotiation about who actually owns the wall.",
    hook: "I should not have asked the landlord to fix the crack in the bathroom wall.",
    display_title: "Confession: the wall",
    handle: "throwaway_rental",
    twist: "The crack was not a crack. It was a door.",
    story_blocks: [
      { text: "The crack in the bathroom had been there since I moved in.", suggested_duration_s: 6 },
      { text: "I finally asked the landlord to look at it.", suggested_duration_s: 3 },
      { text: "He asked me how long I had been able to hear the music.", suggested_duration_s: 7 },
    ],
  },
  {
    premise: "A text message is sent to the wrong person and the wrong person replies before the original sender can correct it.",
    hook: "I should not have answered the number I did not recognize.",
    display_title: "Confession: wrong number",
    handle: "throwaway_phone",
    twist: "It was not a wrong number. The other person had typed it on purpose to test whether I would answer.",
    story_blocks: [
      { text: "The phone buzzed with a number I did not recognize.", suggested_duration_s: 6 },
      { text: "I picked up anyway.", suggested_duration_s: 3 },
      { text: "The voice on the other end was mine, from three years ago.", suggested_duration_s: 7 },
    ],
  },
  {
    premise: "A neighbor's dog is returned home after three days, and the dog refuses to look at its owner.",
    hook: "I should not have brought the dog back myself.",
    display_title: "Confession: the dog",
    handle: "throwaway_dog",
    twist: "The dog had been the one asking to be found. The owner had been looking for an excuse to move out.",
    story_blocks: [
      { text: "The dog had been missing for three days.", suggested_duration_s: 6 },
      { text: "I found her in the stairwell of my building.", suggested_duration_s: 3 },
      { text: "When I brought her home, she sat by the door and would not look at the owner.", suggested_duration_s: 7 },
    ],
  },
];

let stubCounter = 0;
export const makeStubLlm = (response?: string): LlmClient => ({
  async complete() {
    stubCounter += 1;
    if (response !== undefined) return response;
    const t = STUB_TEMPLATES[(stubCounter - 1) % STUB_TEMPLATES.length]!;
    return JSON.stringify({
      premise: t.premise,
      hook: t.hook,
      forum_card: {
        display_title: t.display_title,
        fictional_handle: t.handle,
        fictional_community_label: "confessions",
        relative_time_label: "2 hours ago",
        style_variant: "dark-card",
      },
      confession_voice: "first-person",
      story_blocks: t.story_blocks.map((b, i) => ({ index: i, text: b.text, suggested_duration_s: b.suggested_duration_s })),
      twist: t.twist,
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
