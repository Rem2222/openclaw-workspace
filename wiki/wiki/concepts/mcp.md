---
title: MCP — Model Context Protocol
type: concept
created: 2026-04-06
updated: 2026-04-06
tags: [MCP, Anthropic, AI, tools, protocol]
related: [[mcp-1c-setup]], [[tessl]], [[llm-wiki]]
---

# MCP — Model Context Protocol

**MCP** — открытый протокол от Anthropic (ноябрь 2024), стандартизирующий взаимодействие AI с внешними системами.

> Аналог USB-C для AI: стандартизированный способ подключения AI-приложений к внешним системам.

## Зачем нужен

AI без MCP не знает:
- Деталей синтаксиса конкретной версии платформы
- Метаданных и структуры конфигурации
- Особенностей конкретной базы
- Внутреннего состояния системы

## Архитектура

```
┌─────────────┐     MCP      ┌─────────────┐
│  AI Agent   │◄────────────►│ MCP Server  │
│  (Claude,   │              │  (ваш код)  │
│   Cursor)   │              └─────────────┘
└─────────────┘                    │
                          ┌────────┴────────┐
                          │ Tools/Resources │
                          │ Prompts        │
                          └────────────────┘
```

## Три примитива MCP

| Примитив | Что делает | Пример |
|----------|------------|--------|
| **Tools** | Выполняют действия | `get_metadata()`, `search_code()` |
| **Resources** | Дают данные AI | Файлы конфигурации, код модулей |
| **Prompts** | Шаблоны промптов | "Проанализируй этот запрос 1С" |

## Экосистема

**Клиенты с поддержкой MCP:**
- Claude (desktop, web)
- Cursor
- VS Code (Copilot)
- Windsurf
- Cline
- Amazon Q
- Codex
- И [20+ других](https://modelcontextprotocol.io/clients)

**SDK:**
TypeScript, Python, Java, Kotlin, C#, Go, PHP, Ruby, Rust, Swift
(Hosted by Linux Foundation)

## MCP vs API Key

| | MCP | Direct API |
|---|---|---|
| Контекст | Структурированный, с типами | Голый текст |
| Инструменты | Типизированные, с документацией | Generic |
| Безопасность | Scoped permissions | Full API access |
| for 1С | ✅ Семантический анализ кода | ❌ Нужен парсинг |

## MCP для 1С

См. [[mcp-1c-setup]]

Согласно [бенчмарку Антона Минякова](/wiki/1c/mcp-vs-builtin-token-analysis), MCP экономит **77% токенов** на семантических задачах.

## Быстрый старт (FastMCP)

```bash
# FastMCP — quickest way to build MCP server
npm install -g fastmcp

# Создать server.js
fastmcp add-tool my-tool "Does something" async () => {
  return "result";
}
```

## Интересные MCP-серверы

| Сервер | Описание |
|--------|---------|
| [Filesystem](https://github.com/modelcontextprotocol/server-filesystem) | Доступ к файлам |
| [Git](https://github.com/modelcontextprotocol/server-git) | Git operations |
| [Sequential Thinking](https://github.com/modelcontextprotocol/server-sequential-thinking) | Chain of thoughts |
| [1C MCP](/wiki/1c/mcp-1c-setup) | Для 1С (stub) |

## Источники

- [modelcontextprotocol.io](https://modelcontextprotocol.io)
- [GitHub: modelcontextprotocol](https://github.com/modelcontextprotocol)
- [FastMCP](https://go.fastmcp.com)
- [MCP servers registry](https://modelcontextprotocol.io/docs/tools/node)
