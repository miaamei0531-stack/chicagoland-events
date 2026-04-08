Review the last code change against CLAUDE.md.
1. Read CLAUDE.md fully
2. Check git diff HEAD~1 to see recent changes
3. Verify each change against CLAUDE.md decisions:
   - Design tokens used (no hardcoded values)?
   - API pattern correct (/api/v1/)?
   - Schema matches CLAUDE.md?
   - No secrets in frontend?
   - AI calls go through orchestrator.js?
4. Output APPROVED or REVISION NEEDED with specifics
5. If approved, confirm CLAUDE.md is still current
