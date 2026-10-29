---
name: plan-to-issues
description: Split this repo's plan.md into GitHub issues with gh, one per unit of work, after a human has reviewed the split. Use when a plan is ready and has no issues yet.
---

# plan-to-issues

Turns `plan.md` into GitHub issues that workers can pick up cold. Easiest with `gh`, authenticated,
in a shell this agent can run.

## Steps

1. Read `plan.md`, `AGENTS.md` and `docs/adr/`.
2. Draft the split as a table: title · plan section · scope · done when · blocked by.
   One issue per unit of work.
3. **Stop and show the table to the human.** Publish nothing until they approve it.
4. Every issue carries the shape below (decided by the repo owner, 2026-10-29). Ask the human
   only about anything a plan needs beyond it.
5. Create each issue in dependency order, so blocked-by can cite real numbers:

   ```sh
   gh issue create --title "<title>" --label plan:<plan> --body-file <tmp.md>
   ```

6. Record every issue URL from gh's output (not from memory) and reply with the list.

Closing one, with the closing comment from AGENTS.md:

```sh
gh issue close <n> -c "<closing comment>"
```

## What every issue carries

Label `plan:<plan>` (the `plan:` value in `plan.md`'s frontmatter). Body, in this order:

```md
Source: plan.md § <n>

## Scope
<what to build, from the plan section; the rules that bind it (ADRs, styleguide)>

## Done when
<the plan section's done condition, checkable>

## Blocked by
<#n (what it needs from it), or —>

## Model
<strongest for logic, cheaper for views and tests; one line why>
```

An issue that waits on someone outside the repo (a review, a reply) is done when they have
answered, not when it is sent: keep it open until then, and block the next step on it.

## No `gh`

Steps 1–4 hold either way. GitHub reachable another way (a connector, the REST API, the web UI):
the same issues, made that way. GitHub issues out of reach altogether: write them as files in
`docs/issues/`, format in ADR 0004, then commit and push.

## Don'ts

- Don't paste the whole plan into one issue, and don't keep issues only in chat.
- Don't invent sections the plan doesn't have. If the plan is unclear, ask.
