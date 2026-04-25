---
created: 2026-04-25
tags:
  - x-com
  - claude-code
  - anthropic
  - coding-agent
type: article
---

# Anthropic о Claude Code

**Twitter/X:** x.com/thdxr/status/1973531687629017227

Thdxr (Anthropic) — один из основателей Anthropic, где разрабатывают Claude.

## О чём

Официальный тред Anthropic про Claude Code:
- Возможности и ограничения
- Best practices
- Как Claude Code работает с проектом
- Мониторинг agent activity

## Ключевые моменты

1. **Claude Code мониторит действия агента** — виден процесс reasoning
2. **Tool use** — Claude Code использует те же too как и API
3. **Context management** — контекст агента отделен от пользовательского
4. **Ограничения** — всё ещё есть edge cases где агент зависает

## Claude Code vs OpenClaw

OpenClaw Subagents работают похожим образом:
- Отдельная сессия для subagent
- Subagent получает GOAL + TASK
- Результат возвращается в родительский чат
- Можно мониторить в Dashboard

## Статус

[[status.toread]]

## Источник

[[links-from-sessions]]
