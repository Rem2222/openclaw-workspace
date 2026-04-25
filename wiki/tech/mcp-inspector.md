---
created: 2026-04-25
tags:
  - mcp
  - debugging
  - modelcontextprotocol
type: tool
---

# MCP Inspector

**GitHub:** github.com/modelcontextprotocol/inspector

Официальный инструмент от Model Context Protocol для отладки MCP серверов и клиентов.

## Что делает

Позволяет:
- Подключаться к MCP серверу как клиент
- Видеть все входящие/исходящие запросы
- Тестировать tools, resources, prompts вручную
- Отлаживать проблемы с MCP интеграциями

## Как использовать

```bash
npx @modelcontextprotocol/inspector
# или
npm install -g @modelcontextprotocol/inspector
mcp-inspector
```

Откроется веб-интерфейс где можно:
1. Выбрать MCP сервер (по URL или local socket)
2. Видеть лог запросов/ответов
3. Вызывать tools вручную
4. Проверять schemas

## Когда полезен

- MCP сервер не отвечает — проверить коннект
- Интеграция с Claude Code / Codex не работает — посмотреть ошибки
- Новый MCP сервер — проверить что он корректно отдаёт schema

## Альтернатива

CLI mode для быстрой проверки:
```bash
mcp-inspector --command "npx" --args "server-команда"
```

## Статус

[[status.ready]]

## Заметки

- Part of official modelcontextprotocol org
- Разрабатывается Anthropic + community
- Веб-UI на localhost:6274

## Источник

[[links-from-sessions]]
