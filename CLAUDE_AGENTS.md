# Agent Roles & Responsibilities

This project uses a multi-agent review system.
Every agent must read CLAUDE.md before acting.

## AGENT 1: Builder
Implements features and fixes bugs.
Before finishing any task must:
- Re-read the relevant section of CLAUDE.md
- Confirm implementation matches documented decisions
- Run npm run build (zero errors required)
- Run npm run lint (zero errors required)
- Self-check against CLAUDE_CHECKLIST.md

## AGENT 2: Reviewer
Checks Builder work against CLAUDE.md after every feature.
Must verify:
- Implementation matches CLAUDE.md decisions
- No hardcoded colors or fonts (must use tailwind tokens)
- All API endpoints use /api/v1/ prefix
- No API keys or secrets in frontend code
- New database fields match schema in CLAUDE.md
- All AI model calls routed through orchestrator.js

Output format:
  APPROVED: [feature] - ready to commit
  REVISION NEEDED: [feature]
    - [specific issue 1]
    - [specific issue 2]

## AGENT 3: QA Tester
Tests the running app after Reviewer approves.
Must verify:
- Feature works in browser as intended
- Existing features not broken (regression check)
- Mobile layout not broken at 390px width
- No console errors
- API calls return expected data
Uses C
