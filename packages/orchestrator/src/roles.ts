export const ROLES = {
  storyGenerator: "@rcf/generator",
  heuristicGate: "@rcf/heuristic",
  llmStoryJudge: "@rcf/judge",
  scriptFormatter: "@rcf/formatter",
  visualComposer: "@rcf/composer",
  exportPublisher: "@rcf/exporter",
  analyticsTracker: "@rcf/analytics",
} as const;

export type RoleName = keyof typeof ROLES;
