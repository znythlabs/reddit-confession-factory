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
// engagement metrics, no impersonation patterns). Sized for the 35-60s
// runtime floor, 90-155 word-count band, and 4-7 story-block cap.
const STUB_TEMPLATES: Array<{
  premise: string; hook: string; display_title: string; handle: string; twist: string;
  story_blocks: Array<{ text: string; suggested_duration_s: number }>;
}> = [
  {
    premise: "A small lie told to a coworker starts unraveling a friendship that held up a whole team.",
    hook: "I should not have told Sam that Marcus broke the coffee machine.",
    display_title: "Confession: the coffee machine",
    handle: "throwaway_latenight",
    twist: "Marcus had broken the machine, but he had also been the one telling everyone I broke it, six months earlier.",
    story_blocks: [
      { text: "The coffee machine had been broken for two days when Sam asked me who did it.", suggested_duration_s: 9 },
      { text: "I pointed at Marcus without thinking. The lie felt small at the time.", suggested_duration_s: 8 },
      { text: "By Friday, three other people had repeated the story to me like it was fact.", suggested_duration_s: 9 },
      { text: "Marcus did not correct anyone. He started buying me coffee on his way in.", suggested_duration_s: 9 },
      { text: "I almost said something on the last day, but the lie was the only thing the team still agreed on.", suggested_duration_s: 10 },
    ],
  },
  {
    premise: "A neighbor's late-night routine looks suspicious until the narrator realizes they have been the suspicious one.",
    hook: "I should not have started watching the man in 4B after ten p.m.",
    display_title: "Confession: 4B",
    handle: "throwaway_apartment",
    twist: "He had been watching me the whole time. He had a quiet reason to.",
    story_blocks: [
      { text: "The hallway light in 4B flickers at ten every night without fail.", suggested_duration_s: 8 },
      { text: "I started checking the peephole the first week I lived here.", suggested_duration_s: 8 },
      { text: "He did the same thing on his side of the door, at the same time.", suggested_duration_s: 9 },
      { text: "I thought I was being careful until I saw him set an alarm on his phone.", suggested_duration_s: 9 },
      { text: "The alarm was not for him. It was for me, to make sure I was still awake.", suggested_duration_s: 11 },
    ],
  },
  {
    premise: "An honest edit on a shared document triggers a small office mystery nobody is supposed to know about.",
    hook: "I should not have fixed the typo in the shared doc.",
    display_title: "Confession: shared doc",
    handle: "throwaway_typo",
    twist: "The typo had been left there on purpose, by the same person who wrote the rest of the doc.",
    story_blocks: [
      { text: "The shared doc had a typo on line 12, the same one for three months.", suggested_duration_s: 9 },
      { text: "I fixed it without telling anyone because I thought I was helping.", suggested_duration_s: 8 },
      { text: "By the next morning three people had asked me about it, very carefully.", suggested_duration_s: 9 },
      { text: "Nobody had noticed the typo before. They had all been waiting to see who would.", suggested_duration_s: 10 },
      { text: "I never found out who wrote the doc, but I stopped volunteering to edit anything that month.", suggested_duration_s: 10 },
    ],
  },
  {
    premise: "A returned package sits in a lobby for a week because nobody is sure whose problem it really is.",
    hook: "I should not have picked up the box that was not mine.",
    display_title: "Confession: the box",
    handle: "throwaway_lobby",
    twist: "The box had been sitting there for a year. The person who ordered it had moved out the day it arrived.",
    story_blocks: [
      { text: "The box had been in the lobby for a week before I touched it.", suggested_duration_s: 8 },
      { text: "The courier was giving the concierge a hard time about it that morning.", suggested_duration_s: 9 },
      { text: "I picked it up to get them both to stop arguing in front of the mailboxes.", suggested_duration_s: 9 },
      { text: "I carried it up to my apartment and set it on the kitchen table, still sealed.", suggested_duration_s: 9 },
      { text: "I opened it. The label had my old name on it, from the apartment I left two years ago.", suggested_duration_s: 11 },
    ],
  },
  {
    premise: "A half-remembered song from a parent's car becomes the only evidence of a conversation everyone has agreed to forget.",
    hook: "I should not have started humming the song out loud.",
    display_title: "Confession: the song",
    handle: "throwaway_morning",
    twist: "My mother had been humming it for twenty years, and she had no idea where it came from either.",
    story_blocks: [
      { text: "The song came on the radio during a long drive home from the coast.", suggested_duration_s: 9 },
      { text: "I hummed it for the rest of the week, on the train and in the shower.", suggested_duration_s: 9 },
      { text: "Three people at the coffee shop turned around when I started the second verse.", suggested_duration_s: 9 },
      { text: "Two of them smiled like they recognized it. One of them left without ordering.", suggested_duration_s: 9 },
      { text: "I asked my mother about it on the phone that Sunday. She went quiet for a long time.", suggested_duration_s: 10 },
    ],
  },
  {
    premise: "A small repair request on a rental apartment turns into a slow negotiation about who actually owns the wall.",
    hook: "I should not have asked the landlord to fix the crack in the bathroom wall.",
    display_title: "Confession: the wall",
    handle: "throwaway_rental",
    twist: "The crack was not a crack at all. It was a door, and someone had been standing behind it the whole time I lived here.",
    story_blocks: [
      { text: "The crack in the bathroom had been there since I moved in six months ago.", suggested_duration_s: 9 },
      { text: "I finally emailed the landlord to ask him to send someone to look at it.", suggested_duration_s: 9 },
      { text: "He replied the same day and asked how long I had been able to hear the music.", suggested_duration_s: 10 },
      { text: "I told him I had not heard any music, and he asked me to listen again that night.", suggested_duration_s: 10 },
      { text: "I sat on the bathroom floor at midnight and heard it, faintly, on the other side of the wall.", suggested_duration_s: 10 },
    ],
  },
  {
    premise: "A text message is sent to the wrong person and the wrong person replies before the sender can correct it.",
    hook: "I should not have answered the number I did not recognize.",
    display_title: "Confession: wrong number",
    handle: "throwaway_phone",
    twist: "It was not a wrong number. The other person had typed it on purpose to test whether I would answer.",
    story_blocks: [
      { text: "The phone buzzed with a number I did not recognize late on a Tuesday.", suggested_duration_s: 8 },
      { text: "I picked up because the area code was from the town I grew up in.", suggested_duration_s: 9 },
      { text: "A voice asked if I was the one who used to live on Maple Street.", suggested_duration_s: 9 },
      { text: "I had not lived there in fifteen years, but I said yes before I could stop myself.", suggested_duration_s: 10 },
      { text: "The voice laughed softly and said they had been trying to reach me for a long time.", suggested_duration_s: 10 },
    ],
  },
  {
    premise: "A neighbor's dog is returned home after three days, and the dog refuses to look at its owner.",
    hook: "I should not have brought the dog back myself.",
    display_title: "Confession: the dog",
    handle: "throwaway_dog",
    twist: "The dog had been the one asking to be found. The owner had been looking for an excuse to move out.",
    story_blocks: [
      { text: "The dog had been missing for three days before I found her in my stairwell.", suggested_duration_s: 9 },
      { text: "She was calm, like she had been waiting there for someone to walk past.", suggested_duration_s: 9 },
      { text: "I carried her up to the apartment across from mine, where the owner lived alone.", suggested_duration_s: 9 },
      { text: "She sat by the front door and would not look at the owner when I set her down.", suggested_duration_s: 10 },
      { text: "The owner thanked me quietly and said the dog had been doing this every few months for years.", suggested_duration_s: 10 },
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
