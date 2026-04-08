---
title: MCP для 1С — Настройка и использование
type: guide
created: 2026-04-06
updated: 2026-04-06
tags: [MCP, 1C, BSL, настройка, Claude Code]
related: [[mcp]], [[sdd]], [[mcp-vs-builtin-token-analysis]]
---

# MCP для 1С — Настройка

> Документация по настройке MCP-сервера для работы с кодом 1С.

## Зачем MCP для 1С

Согласно [бенчмарку Антона Минякова](/wiki/1c/mcp-vs-builtin-token-analysis):
- **77% экономия токенов** на семантических задачах
- **4.3x** уменьшение input tokens
- **2x** ускорение выполнения
- **Нет false positives** в отличие от Grep

## Что даёт MCP для 1С

| Операция | Без MCP | С MCP |
|----------|---------|-------|
| Структура модуля | 5-10 вызовов Grep/Read | 1 вызов `get_module_structure` |
| Иерархия вызовов | Grep + фильтрация | 1 вызов `get_method_call_hierarchy` |
| Метаданные объекта | Парсинг XML | 1 вызов `get_metadata_details` |
| Валидация запроса | 6-10 итераций | 1 вызов `validate_query` |

## SDD + MCP для 1С

**[[sdd|SDD]] (Spec-Driven Development)** + MCP = мощная связка:

1. **Spec-first**: пишем спецификацию для задачи
2. **MCP**: получаем структурированный контекст код
3. **AI**: генерирует код по spec
4. **Traceability**: каждый сгенерированный код trace-тся к spec

### Пример workflow

```
1. /opsx:new add-exchange-setting  # OpenSpec создаёт папку
2. MCP: get_module_structure("ExchangeModule")  # Получаем структуру
3. MCP: get_metadata_details("ExchangeSettings")  # Метаданные
4. AI: генерирует код по spec
5. MCP: validate_query(new_query)  # Валидация
```

## Установка MCP-сервера для 1С

*(TODO: требуется инструкция по установке конкретного MCP-сервера для 1С)*

### Ожидаемые инструменты

| Инструмент | Описание |
|------------|----------|
| `get_module_structure` | Карта модуля (процедуры, функции, области, экспорт) |
| `get_method_call_hierarchy` | Все вызывающие семантически точно |
| `get_metadata_details` | Реквизиты, типы, табличные части |
| `bsl_scope_members` | Доступные методы и свойства в контексте |
| `validate_query` | Валидация запроса 1С |
| `inspect_form_layout` | Дерево элементов формы |

## Интеграция с Claude Code

```bash
# В Claude Code добавить MCP-сервер
claude mcp add 1c -- python -m bsl_mcp_server

# Или через config
# ~/.claude/mcp.json
{
  "mcpServers": {
    "1c": {
      "command": "python",
      "args": ["-m", "bsl_mcp_server"]
    }
  }
}
```

## Ресурсы

- [MCP Documentation](https://modelcontextprotocol.io)
- [1C documentation](/wiki/1c)
- [SDD tools comparison](/wiki/concepts/sdd)
- [Claude Code MCP integration](https://docs.anthropic.com/en/docs/claude-code/mcp)
