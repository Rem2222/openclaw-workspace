---
name: superpowers
description: >
  Spec-first, TDD, subagent-driven software development workflow. Use when:
  (1) building any new feature or app — triggers brainstorm → plan → subagent execution loop,
  (2) debugging a bug or test failure — triggers systematic root-cause process,
  (3) user says "let's build", "help me plan", "I want to add X", or "this is broken",
  (4) completing a feature branch — triggers test verification + merge/PR options.
  NOT for: one-liner fixes (just edit), reading code, or non-code tasks.
  Requires exec tool, sessions_spawn, and Beads (bd) for task tracking.
  **Default agents:** GLM-5 (opencode-go/glm-5) — спрашивать при запуске проекта.
---

# Superpowers — OpenClaw Edition

Adapted from [obra/superpowers](https://github.com/obra/superpowers). Mandatory workflow — not suggestions.

## The Pipeline

```
Idea → Brainstorm → Plan → Subagent-Driven Build (TDD) → Code Review → Finish Branch
```

Every coding task follows this pipeline. "Too simple to need a design" is always wrong.

---

## Phase 1: Brainstorming

**Trigger:** User wants to build something. Activate before touching any code.

**See:** [references/brainstorming.md](references/brainstorming.md)

**Summary:**
1. Explore project context (files, docs, recent commits)
2. Ask clarifying questions — **one at a time**, prefer multiple choice
3. Propose 2–3 approaches with trade-offs + recommendation
4. Present design in sections, get approval after each
5. Write design doc → `docs/plans/YYYY-MM-DD-<topic>-design.md` → commit
6. Hand off to **Phase 2: Writing Plans**

**HARD GATE:** Do NOT write any code until user approves design.

---

## Phase 2: Writing Plans

**Trigger:** Design approved. Activated by brainstorming phase.

**See:** [references/writing-plans.md](references/writing-plans.md)

**Summary:**
- Write a detailed task-by-task implementation plan
- Each task = 2–5 minutes: write test → watch fail → implement → watch pass → commit
- Save to `docs/plans/YYYY-MM-DD-<feature>.md`
- Announce: `"I'm using the writing-plans skill to create the implementation plan."`
- **After saving, immediately create ALL tasks in Beads:** `bd create "[PROJECT] Task N: Description | File: docs/plans/...md#task-N"`
- After saving, offer two execution modes:
  - **Subagent-driven (current session):** `sessions_spawn` per task + two-stage review
  - **Manual execution:** User runs tasks themselves

---

## Phase 3: Subagent-Driven Development

**Trigger:** Plan exists, user chooses subagent-driven execution.

**See:** [references/subagent-development.md](references/subagent-development.md)

**Default agent model:** `opencode-go/glm-5` (GLM-5) — спрашивать у пользователя при запуске проекта, какой агент использовать.

**Beads (обязательно):**
1. `bd ready` → показать доступные задачи
2. `bd update <id> --claim` → начать работу
3. После завершения: `bd update <id> --status done`

**Per-task loop (OpenClaw):**
1. `sessions_spawn` an implementer subagent with task + full plan context
   - **label:** `bd:<BD_ISSUE_ID>` — например `bd:workspace-bzd`
   - **Model:** opencode-go/glm-5 (или выбранный пользователем)
   - **После спавна — зарегистрировать сессию:** `POST /api/issues/sessions` с `{ sessionKey: "<childSessionKey>", issueId: "<BD_ISSUE_ID>" }`
   - Использовать `host="gateway", port=3000` для Dashboard API
2. Wait for completion announcement
3. `sessions_spawn` a spec-reviewer subagent → must confirm code matches spec
   - **label:** `review:spec:<BD_ISSUE_ID>`
   - **Model:** opencode-go/glm-5
   - **После спавна — зарегистрировать сессию:** `POST /api/issues/sessions` с `{ sessionKey: "<childSessionKey>", issueId: "<BD_ISSUE_ID>" }`
4. `sessions_spawn` a code-quality reviewer subagent → must approve quality
   - **label:** `review:quality:<BD_ISSUE_ID>`
   - **Model:** opencode-go/glm-5
   - **После спавна — зарегистрировать сессию:** `POST /api/issues/sessions` с `{ sessionKey: "<childSessionKey>", issueId: "<BD_ISSUE_ID>" }`
5. Fix any issues, re-review if needed
6. Mark task done in Beads: `bd update <id> --status done`
7. Move to next task
8. Final: dispatch overall code reviewer → hand off to Phase 5

**TDD is mandatory in every task.** See [references/tdd.md](references/tdd.md).

---

## Phase 4: Systematic Debugging

**Trigger:** Bug, test failure, unexpected behaviour — any technical issue.

**See:** [references/systematic-debugging.md](references/systematic-debugging.md)

**HARD GATE:** No fixes without root cause investigation first.

**Four phases:**
1. Root Cause Investigation (read errors, reproduce, check recent changes, trace data flow)
2. Pattern Analysis (find working examples, compare, identify differences)
3. Hypothesis + Testing (one hypothesis at a time, test to prove/disprove)
4. Fix + Verification (fix at root, not symptom; verify fix doesn't break anything)

---

## Phase 5: Finishing a Branch

**Trigger:** All tasks complete, all tests pass.

**See:** [references/finishing-branch.md](references/finishing-branch.md)

**Beads:** Убедиться что все задачи закрыты (`bd list` → все ✓).

**Summary:**
1. Verify all tests pass
2. Verify all Beads tasks are closed: `bd list`
3. Determine base branch
4. Present 4 options: merge locally / push + PR / keep / discard
5. Execute choice
6. Clean up

---

## OpenClaw Subagent Dispatch Pattern

When dispatching implementer or reviewer subagents, use `sessions_spawn`:

**При запуске проекта (Phase 2/3):** Спросить у пользователя, какой агент использовать:
> "Какую модель использовать для subagent-ов? По умолчанию GLM-5 (opencode-go/glm-5)."

```
sessions_spawn:
  task: [Goal + Context + Files + Constraints + Verify + Task text]
  model: opencode-go/glm-5  # или выбранная пользователем модель
  mode: run
  runtime: subagent
```

**Prompt template:**
```
Goal: [one sentence]
Context: [why it matters, which plan file]
Files: [exact paths]
Constraints: [what NOT to do — no scope creep, TDD only]
Verify: [how to confirm success — tests pass, specific command]
Task text: [paste full task from plan]
```

Run `sessions_spawn` with the task as a detailed prompt. The sub-agent announces results automatically.

### Register Session API (Post-Spawn) — **ОБЯЗАТЕЛЬНО**

После каждого `sessions_spawn` нужно **СРАЗУ** зарегистрировать сессию в Dashboard API:

```bash
# 1. sessions_spawn возвращает { childSessionKey: "agent:main:subagent:xxx" }
# 2. Извлечь issueId из label: "bd:workspace-dl6" → "workspace-dl6"
# 3. СРАЗУ вызвать регистрацию (не ждать завершения!)

curl -X POST http://localhost:3000/api/issues/sessions \
  -H "Content-Type: application/json" \
  -d '{"sessionKey": "<childSessionKey>", "issueId": "<issueId>"}'
```

**典型流程:**
```
1. sessions_spawn(label: "bd:workspace-1ac", ...)
   → returns { childSessionKey: "agent:main:subagent:b45ff9cb-..." }
2. curl -X POST http://localhost:3000/api/issues/sessions \
     -d '{"sessionKey": "agent:main:subagent:b45ff9cb-...", "issueId": "workspace-1ac"}'
3. Subagent работает → Monitor показывает его в реальном времени
```

**⚠️ ВАЖНО:** Регистрация должна быть СРАЗУ после spawn, пока subagent работает. Не после завершения!

**Зачем:** Dashboard Monitor показывает субагентов по проектам. Регистрация связывает сессию с issue.

**Пример:**
```
# Label: bd:workspace-dl6
# childSessionKey: agent:main:subagent:e9ca4837-...

curl -X POST http://localhost:3000/api/issues/sessions \
  -H "Content-Type: application/json" \
  -d '{"sessionKey": "agent:main:subagent:e9ca4837-cb6c-411b-a838-a1b8c2a8a0e0", "issueId": "workspace-dl6"}'
```

---

## Key Principles

- **One question at a time** during brainstorm
- **TDD always** — write failing test first, delete code written before tests
- **YAGNI** — remove unnecessary features from all designs
- **DRY** — no duplication
- **Systematic over ad-hoc** — follow the process especially under time pressure
- **Evidence over claims** — verify before declaring success
- **Frequent commits** — after each green test

---

## Beads Integration

[Beads](https://github.com/steveyegge/beads) — distributed issue tracker for AI agents, powered by Dolt.

**Важно:** Beads **обязателен** для управления задачами в Superpowers. Это заменяет txt-файлы прогресса. Все задачи должны создаваться, трекаться и закрываться через `bd`.

### Why Beads?
- Replaces txt-based task tracking (progress-*.txt)
- Provides structured storage with `bd` CLI
- Integrates with git (Dolt = Git for data)
- Видим прогресс в реальном времени

### Setup
```bash
cd ~/.openclaw/workspace
npx @beads/bd init
```

### Key Commands (обязательно использовать)
```bash
bd create "[Dashboard] Task description | File: docs/plans/...md#task-1"  # Создать задачу
bd ready                    # Показать доступные задачи
bd show <id>               # Посмотреть детали задачи
bd update <id> --claim      # Взять в работу (open → in_progress)
bd update <id> --status done # Завершить задачу
bd list                     # Список всех задач
```

### Integration with Superpowers

**Phase 2 (Writing Plans):**
1. Создать план в `docs/plans/YYYY-MM-DD-<feature>.md`
2. **Сразу создать все задачи в Beads:** `bd create "[Dashboard] Task N: description | File: docs/plans/...md#task-N"`

**Phase 3 (Development):**
1. `bd ready` → получить следующую задачу
2. `bd update <id> --claim` → начать работу
3. Выполнить задачу (subagent или вручную)
4. `bd update <id> --status done` → закрыть задачу
5. Повторить для следующей задачи

**What stays the same:**
- Plan files (markdown) stay for detailed specs
- TDD process unchanged
- Subagent dispatch via `sessions_spawn`

**What changes:**
- Manual txt tracking → **обязательно `bd` команды**
- Task status in Beads, not files

### Example Workflow
```bash
# After planning phase — создать ВСЕ задачи
bd create "[Dashboard] Task 1: Layout | File: docs/plans/2026-04-01-redesign-tasks.md#task-1"
bd create "[Dashboard] Task 2: Agents | File: docs/plans/2026-04-01-redesign-tasks.md#task-2"

# Перед каждой задачей — показать Beads output
bd ready              # Shows next available task
bd show workspace-xxx # Details with file reference

# Development
bd update workspace-xxx --claim    # Start working
# ... implement ...
bd update workspace-xxx --status done  # Complete

# Show progress
bd list
```
