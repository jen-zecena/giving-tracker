---
name: review-pr
description: Review a pull request against its linked GitHub issue, acceptance criteria, and project best practices. Use when the user asks to review a PR, passes a PR number, or says "review this PR".
argument-hint: <pr-number>
---

# PR Review

Review pull request #$ARGUMENTS for the Giving Tracker project.

## Step 1: Gather Context

Run all of these in parallel:

1. **PR details:** `gh pr view $ARGUMENTS --json title,body,baseRefName,headRefName,files,additions,deletions,url`
2. **PR diff:** `gh pr diff $ARGUMENTS`
3. **PR checks status:** `gh pr checks $ARGUMENTS`

## Step 2: Find the Linked Issue

Extract the linked issue number from the PR body or branch name (look for `Closes #N`, `Fixes #N`, `task-NNN/` in branch name, or `#N` references).

Then fetch the issue: `gh issue view <number> --json title,body,labels`

Parse out:
- **Tasks** checklist (`- [x]` / `- [ ]` items)
- **Acceptance Criteria** checklist

If no linked issue is found, note this as a gap and proceed with code-only review.

## Step 3: Review the Diff

Read every changed file in the PR. For each file, check:

### Acceptance Criteria Alignment
- Does every acceptance criterion from the issue have corresponding code changes?
- Are there any criteria that are NOT addressed by the code?
- Are there code changes that go BEYOND the issue scope (scope creep)?

### Task Completion
- Are all tasks from the issue checklist addressed?
- Flag any unchecked tasks.

### Code Quality (per CLAUDE.md rules)
- **TypeScript:** Proper types, no `any`, no type assertions without justification
- **React/Next.js:** Server Components by default, `'use client'` only when needed and pushed down the tree
- **Styling:** Uses shadcn/ui theme tokens (not raw Tailwind palette colors), no `transition-all`, responsive/mobile-first
- **Imports:** Uses `@/` path aliases
- **Security:** No hardcoded secrets, no XSS vectors, no SQL injection, user input validated at boundaries
- **Architecture:** Privacy model respected, salary never exposed, currency USD-only (Phase 1)

### Common Issues to Flag
- Missing loading/empty/error states on data-driven components
- Missing hover/focus-visible/active states on interactive elements
- `console.log` left in production code
- Overly broad `try/catch` that swallows errors
- New dependencies that duplicate existing functionality
- Files that should have been updated but weren't (e.g., types, exports)

## Step 4: Produce the Review

Structure your review as follows:

### Summary
One paragraph: what does this PR do and does it achieve its goal?

### Issue Alignment
| Acceptance Criterion | Status | Notes |
|---|---|---|
| (each criterion from the issue) | Pass / Fail / Partial | (details) |

### Task Checklist
| Task | Status |
|---|---|
| (each task from the issue) | Done / Missing |

### Code Review Findings

For each finding, include:
- **File and line reference** (e.g., `src/app/dashboard/page.tsx:42`)
- **Severity:** Critical (must fix) / Warning (should fix) / Nit (nice to have)
- **What:** Description of the issue
- **Why:** Why it matters
- **Suggested fix:** Concrete code suggestion when possible

### Verdict

State one of:
- **Ready to merge** — All acceptance criteria pass, no critical findings.
- **Ready with nits** — All criteria pass, only nit-level suggestions. List them briefly.
- **Changes requested** — Critical or warning findings that should be addressed. Summarize what needs to change.

Be direct and specific. Reference file paths and line numbers. Don't pad with praise — focus on what matters.
