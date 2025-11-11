# DEPLOYMENT WORKFLOW - CRITICAL

⚠️ **MANDATORY WORKFLOW - READ BEFORE EVERY GIT PUSH** ⚠️

## Rule: NEVER push to GitHub without user's explicit approval after local testing

### Correct Workflow:

1. **Make code changes**
2. **Build locally**: `npm run build`
3. **STOP and inform user**: "Changes are ready. Please test locally before I push to GitHub."
4. **WAIT for user confirmation**: User must explicitly say "push" or "deploy" or similar
5. **Only then**: `git add`, `git commit`, `git push`

### Wrong Workflow (DO NOT DO THIS):

❌ Make changes → Build → Auto push
❌ Make changes → Push without testing
❌ Assume user wants immediate deployment

## User's Requirement:

> "don´t push to GitHub until I have tested locally. implement measures to ensure that workflow is used every time."

This means:
- User wants to test changes in local dev environment first
- User will explicitly tell you when to push
- Do NOT push automatically after building
- Always ask: "Ready to test locally. Should I push to GitHub after your testing?"

## Exception:

Only push immediately if user explicitly says in the same message:
- "...and push to GitHub"
- "...and deploy"
- "...push when done"

Otherwise: WAIT FOR APPROVAL.
