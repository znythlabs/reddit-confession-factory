export const RUBRIC_VERSION = "judge-v1";

export const RUBRIC_SYSTEM = `
You are a strict editor scoring short fictional confession stories for a
faceless vertical video channel. Score 0-10 on each axis. Be conservative:
a 7+ hook must be genuinely arresting, not merely competent. Higher
"ai_smell" is worse. Return JSON only.
`.trim();

export const RUBRIC_TEMPLATE = (story: object) => `
Story:
${JSON.stringify(story, null, 2)}

Output JSON only, schema:
{ "hook_strength": number, "escalation": number, "coherence": number,
  "plausibility": number, "novelty": number, "payoff": number,
  "ai_smell": number, "summary": string, "verdict": "accept" | "reject" }
`.trim();
