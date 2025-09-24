# Git Workflow

## Branch Strategy

- **main**: Production-ready code only
- **develop**: Integration branch for feature development
- **feature/\***: Feature branches created from develop

## Development Workflow

1. Create feature branch from develop:
   \`git checkout develop && git checkout -b feature/story-x.x-description\`

2. Work on feature with regular commits

3. Before merge, ensure code quality( run from apps/web):
   - Tests pass: \`npm test\`
   - Linting & quality check passes: \`npm run lint && npm run type-check\`
   - Build succeeds: \`npm run build\`

4. Create pull request to develop

5. After review and approval, merge to develop

6. For releases, merge develop to main

## Commit Message Format

\`type(scope): description\`

Types: feat, fix, docs, style, refactor, test, chore

## Jira Branch Naming Convention

**Format:** type/TICKET-ID-short-description
git checkout -b feature/DEV-124-setup-nextjs-typescript
git checkout -b bugfix/DEV-125-fix-tailwind-config
git checkout -b task/DEV-126-configure-eslint

### Jira Smart Commit Commands

**Transition tickets**
git commit -m "DEV-123 #in-progress Add user authentication"
git commit -m "DEV-123 #done Fix login validation #time 2h"

**Add comments**
git commit -m "DEV-123 #comment Refactored auth middleware for better performance"

**Log work time**
git commit -m "DEV-123 Implement password hashing #time 1h 30m"

**Note:** Documented workflows ensure team consistency and provide guidance for new team members.
