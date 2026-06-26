# Reddit-Style Confession Story Factory Design

**Date:** 2026-06-26

## Goal

Design an OMP-driven automation system that generates fully fictional confession-style short-form stories, renders them as faceless vertical videos, prepares publish-ready assets for TikTok, Instagram Reels, and YouTube Shorts, and exposes an observer-only dashboard for monitoring pipeline health and outcomes.

## Scope

This design covers:
- automated story generation for fictional confession-style content
- hybrid scoring and filtering before rendering
- vertical video rendering with a forum-inspired hook card and mood-matched backgrounds
- export-first publishing packages for TikTok, Reels, and Shorts
- observer-only operations dashboard for monitoring jobs and results
- analytics capture for prompt/template selection and content optimization
- role-based subagent orchestration inside OMP

This design does **not** cover:
- direct v1 platform posting APIs
- human approval gates as a normal publishing path
- comment automation or audience engagement bots
- model fine-tuning
- real Reddit scraping or reposting of real confessions
- forged Reddit UI replication

## Product Definition

The system is a fiction-first faceless short-video pipeline that generates confession-style stories, filters them through hybrid scoring, renders vertical videos with a forum-inspired hook card and mood-matched backgrounds, exports publish-ready assets for TikTok, Reels, and Shorts, and exposes an observer-only dashboard for monitoring pipeline health and outcomes.

## User Decisions Captured

- **Primary platforms:** TikTok, Instagram Reels, YouTube Shorts
- **Launch posture:** balanced quality and scale
- **Disclosure posture target:** no disclosure focus
- **Safety/product decision:** internal content model remains fiction-first rather than pretending stories were scraped from Reddit
- **Dashboard:** include a minimal observer-only dashboard in v1
- **Subagents:** recommended, with a small fixed role-based team

## Core Principles

1. **Fiction-first generation**
   - Every story is original synthetic fiction.
   - The system must never depend on scraped Reddit content.
   - The content may evoke the confession-forum genre, but not claim provenance from a real post.

2. **Forum-inspired hook card, not forged platform UI**
   - The intro visual may use a discussion-forum-inspired layout.
   - It must not copy Reddit pixel-for-pixel.
   - It must not show fabricated vote counts, comment counts, awards, karma, or engagement metrics.
   - It must not use real subreddit names.
   - It must not use usernames that impersonate real people.

3. **Autopilot by default**
   - v1 should run without daily mandatory approvals.
   - Monitoring is allowed; human review is optional exception handling, not the main path.

4. **Balanced quality and scale**
   - The system should produce enough volume for testing and learning without flooding low-quality output.
   - Filtering quality gates should be cheap first, expensive second.

5. **Structured artifacts over giant prompts**
   - Stories, scores, render plans, publishing bundles, and analytics must be represented as machine-readable artifacts.

## High-Level Architecture

The system should be implemented as a content factory pipeline rather than one large prompt.

### 1. Story Generator
Generates fictional confession-style stories from parameterized prompts.

Inputs:
- tone
- taboo/intensity band
- ending type
- approximate runtime target
- platform targets
- freshness constraints from recent published history

Output:
- structured `story_package.json`

### 2. Hybrid Scoring Layer
Filters weak output before rendering.

#### Stage A: heuristic gate
Fast deterministic checks for:
- runtime fit
- hook length
- paragraph cadence
- duplicate premise detection
- banned or overused endings
- readability and TTS fitness
- structural completeness

#### Stage B: LLM judge pass
Single budgeted judge pass for surviving candidates, scoring:
- hook strength
- emotional escalation
- coherence
- plausibility within the fictional frame
- novelty
- payoff/twist quality
- risk of sounding obviously machine-written

This stage is batch-budgeted and should not be invoked blindly for every generated draft if the heuristic gate already rejects it.

### 3. Script Formatter
Transforms accepted story packages into render-ready scene plans.

Outputs include:
- forum-inspired hook card copy
- paragraph/story block segmentation
- scene pacing metadata
- CTA/outro variants
- platform-specific text density overrides

### 4. Visual Composer
Uses a faceless-video rendering pipeline to produce final vertical videos.

Responsibilities:
- render intro hook card
- render sequential story blocks
- choose a background look based on mood tags
- combine TTS with ambient BGM
- produce platform-specific video variants if needed

### 5. Export / Publishing Packager
Creates publish-ready bundles rather than posting directly in v1.

Outputs:
- MP4 render(s)
- title variants
- caption text
- hashtag suggestions
- scheduling metadata
- manifest for later posting automation

### 6. Observer-Only Dashboard
Displays pipeline state and results without becoming a daily approval surface.

### 7. Feedback / Analytics Layer
Records outcomes and helps tune prompt families, selection heuristics, background choices, voices, pacing patterns, and hook shapes.

## Canonical Data Model

The core unit should be a structured story package.

### `story_package`
Required fields:
- `story_id`
- `created_at`
- `premise`
- `hook`
- `forum_card`
- `confession_voice`
- `story_blocks[]`
- `twist`
- `ending_mode`
- `tone`
- `intensity`
- `background_mood`
- `music_mood`
- `tts_voice`
- `cta`
- `platform_variants`
- `generation_prompt_version`
- `freshness_fingerprint`

### `forum_card`
Required fields:
- `display_title`
- `fictional_handle`
- `fictional_community_label`
- `relative_time_label`
- `style_variant`

Forbidden fields:
- votes
- comments count
- awards
- karma
- real subreddit reference
- any identifier copied from a real user

### `score_report`
Required fields:
- `story_id`
- `heuristic_checks[]`
- `heuristic_pass`
- `judge_scores`
- `judge_summary`
- `accept_decision`
- `reject_reasons[]`

### `render_package`
Required fields:
- `story_id`
- `scene_plan`
- `timing_map`
- `background_assets`
- `audio_assets`
- `render_targets`

### `publish_bundle`
Required fields:
- `story_id`
- `platform`
- `video_path`
- `caption`
- `title_options[]`
- `hashtags[]`
- `scheduled_at`
- `status`

## Daily Operating Flow

Recommended daily batch:
1. Generate 20-30 story candidates.
2. Run heuristic gate.
3. Run LLM judge on survivors.
4. Keep 3-8 finalists.
5. Render platform-ready assets.
6. Export 1-3 publishable assets per platform per day.
7. Record downstream performance.

This supports balanced quality and scale without turning the system into a spam farm.

## Video Format

### Format
- Primary format: 9:16 vertical
- Runtime target: short-form social, optimized per platform
- TikTok/Reels should bias toward faster hooks and shorter blocks
- YouTube Shorts may allow slightly longer narrative pacing

### Opening scene
- forum-inspired hook card
- large title/hook text
- fictional handle and fictional community label
- timestamp-style label allowed if obviously generic
- maximum intro emphasis duration: brief and front-loaded

### Body scenes
- text presented in short paragraph blocks
- 1-3 sentences per block
- subtle motion only; readability over flashy animation
- mood-matched background per story

### Background library
Backgrounds may be static or looping video and should be tagged by mood, e.g.:
- eerie room
- rainy window
- dark hallway
- empty street
- VHS/static/glitch

Backgrounds must preserve text contrast and never dominate the story text.

### Audio
- TTS narration
- low-volume ambient bed
- optional sparse SFX at transitions or twist moments
- audio choices should be tied to `background_mood` and `tone`

## Platform Strategy

### Shared core
All three platforms should share the same canonical story package and analytics identifiers.

### TikTok / Reels
Bias toward:
- faster hook
- shorter blocks
- stronger pacing changes
- more aggressive early retention optimization

### YouTube Shorts
Bias toward:
- slightly longer narrative arc
- cleaner continuity between blocks
- slightly less frantic pacing

## OMP Role-Based Subagents

Use a small fixed team of role-based subagents rather than a large swarm.

Recommended roles:
- **Story Generator** — creates candidate fictional stories
- **Heuristic Gate** — runs deterministic acceptance checks
- **LLM Story Judge** — scores survivors for quality
- **Script Formatter** — converts accepted stories into scene-ready story packages
- **Visual Composer** — renders videos and assets
- **Export/Publisher** — packages deliverables for each platform
- **Analytics Tracker** — records outcomes and summarizes trends

### Orchestration guidance
- keep responsibilities stable per role
- parallelize independent stories, not every micro-step
- isolate failures by artifact stage
- use deterministic files between agents, not loose prose handoffs

## Dashboard Design

The dashboard is included in v1 as an observer-only ops console.

### Included screens
1. **Pipeline health**
   - job counts by stage
   - failed/retrying jobs
   - current throughput
   - backlog depth

2. **Story inventory**
   - hook preview
   - score summary
   - render status
   - platform bundle status

3. **Schedules and publishing state**
   - what is queued
   - what is exported
   - what is published
   - what failed packaging

4. **Outcome monitoring**
   - retention snapshots
   - completion rate
   - likes/comments/shares/save-rate where available
   - breakdowns by hook type, tone, twist, background mood, and voice

5. **Logs and alerts**
   - pipeline failures
   - repeated score rejects
   - render failures
   - missing asset conditions

### Explicitly excluded from v1 dashboard
- mandatory approval workflow
- regular approve/reject gating
- in-dashboard editing
- drag-and-drop workflow builders
- large BI/analytics suite
- complex user management

## Error Handling and Quality Gates

### Generation rejects
Reject stories if:
- the hook is weak or too long
- pacing is flat
- the story has no payoff
- the premise is too similar to recent output
- the runtime is mismatched to target platform
- the text reads too obviously like low-quality machine output

### Render rejects
Reject or rerender if:
- hook card overflows
- text density is too high
- TTS timing mismatches scene timing
- text/background contrast is poor
- background overwhelms foreground text
- forum-inspired card violates the no-forgery rules

### No-forgery render gate
The renderer must fail validation if any output includes:
- fabricated vote counts
- fabricated comment counts
- fabricated awards or karma
- real subreddit names
- usernames likely to impersonate real users
- UI framing that materially suggests a real captured Reddit post

### Operational alerts
Raise alerts when:
- rejection rate spikes above baseline
- render failures cluster by template
- a single premise family dominates recent output
- platform variants drift out of runtime bounds

## Analytics and Learning

v1 learning means analytics-driven selection, not model fine-tuning.

Track per story:
- premise category
- hook pattern
- twist type
- tone
- intensity
- background mood
- TTS voice
- runtime
- heuristic scores
- judge scores
- final accept/reject
- platform package outputs
- downstream performance metrics

Use this data to tune:
- prompt families
- seed prompts
- hook templates
- pacing patterns
- voice selection
- background selection
- CTA variants

Do **not** include model fine-tuning in v1.

## Recommended v1 Scope

Include only:
1. story generation
2. hybrid scoring
3. video rendering
4. export package creation
5. observer-only dashboard
6. analytics capture

Do not include:
- direct platform posting as a hard requirement
- multi-account management
- comment automation
- self-modifying autonomous prompt mutation
- dashboard review queue as the main path
- dozens of visual themes before the core pipeline works

## Risks and Tradeoffs

### Policy/trust risk
Because the target style resembles user confession content, the system should preserve a fiction-first internal model even if the public-facing copy is optimized for clicks. This reduces policy and trust risk relative to pretending stories were scraped from real users.

### Creative consistency risk
Story quality will vary. The scoring layer and freshness constraints are required, not optional.

### Automation risk
Autopilot increases the chance of low-quality repetition if freshness checks and analytics are weak.

### Dashboard scope risk
A dashboard can easily become a second product. v1 must keep it as a thin operator console.

## Open Implementation Decisions for Planning

These are implementation choices, not product-definition gaps:
- exact storage format and persistence layer for story, score, render, and analytics artifacts
- exact rendering stack details within the existing OMP/HyperFrames environment
- exact dashboard framework and hosting model
- exact scheduler mechanism for recurring generation/render/export jobs
- exact publish-bundle schema details per platform

## Acceptance Criteria for the Future Implementation Plan

A valid implementation plan must produce a system that:
1. generates only fictional confession-style story candidates
2. stores story candidates as structured artifacts
3. runs a two-stage hybrid scoring pipeline
4. renders a forum-inspired hook card without forged Reddit UI cues
5. produces publish-ready vertical video bundles for TikTok, Reels, and Shorts
6. exposes an observer-only dashboard for pipeline state and outcomes
7. records enough analytics to compare hook/tone/twist/background/voice performance
8. uses a small fixed set of role-based OMP subagents rather than an uncontrolled agent swarm
