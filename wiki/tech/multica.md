---
description: Open-source managed agents platform. Turn coding agents into real teammates.
tags: [agents, openclaw, claude-code, codebase]
related: [[openclaw]], [[heisenberg-team-gpt]], [[mcp]]
---

# Multica

**URL:** https://github.com/multica-ai/multica  
**License:** Apache 2.0  
**Website:** https://multica.ai

## What is it?

Open-source платформа для управления AI-агентами. Превращает кодинг-агентов в "реальных членов команды" — назначай задачи через Issues, агенты выполняют работу и отчитываются.

## Key Features

- **Agents as Teammates** — назначай задачи агенту как коллеге. У каждого агента профиль, он появляется на доске, пишет комментарии, создаёт Issues
- **Autonomous Execution** — полный жизненный цикл задачи: enqueue → claim → start → complete/fail
- **Reusable Skills** — решения сохраняются как навыки для всей команды
- **Unified Runtimes** — один дашборд для всех compute (local + cloud)
- **Multi-Workspace** — изоляция команд

## Supported Agents

- Claude Code
- Codex
- OpenClaw
- OpenCode

## Installation

### Self-Hosted (Docker)

```bash
git clone https://github.com/multica-ai/multica.git
cd multica
cp .env.example .env
# Edit .env — change JWT_SECRET at minimum
docker compose -f docker-compose.selfhost.yml up -d
```

Откроется на http://localhost:3000

### Cloud

https://multica.ai/app — без установки

## OpenClaw Integration

```bash
# Установить CLI
brew tap multica-ai/tap
brew install multica

# Авторизоваться и запустить daemon
multica login
multica daemon start
```

Daemon автоматически найдёт OpenClaw CLI на PATH. Агент появится в дашборде Multica.

## Comparison

| Feature | Multica | OpenClaw |
|---------|---------|----------|
| UI Dashboard | ✅ | ✅ (Cockpit) |
| Task/Issue tracking | ✅ | ❌ |
| Agent collaboration | ✅ | Partial |
| Skills reuse | ✅ | ❌ |
| Self-hosted | ✅ | ✅ |

## Notes

Multica решает проблему "у меня много агентов, как ими управлять?". Добавляет:
- Единую доску задач для всех агентов
- Назначение задач через привычный UI
- Compound skills — навыки накапливаются

Может быть полезен для масштабных проектов где несколько агентов работают параллельно.
