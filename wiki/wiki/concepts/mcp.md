# MCP — Model Context Protocol

**MCP** — открытый протокол от Anthropic (ноябрь 2024), стандартизирующий взаимодействие AI с внешними системами.

## Зачем нужен

AI без MCP не знает:
- Деталей синтаксиса конкретной версии платформы
- Метаданных и структуры конфигурации
- Особенностей конкретной базы

## Архитектура

```
┌─────────────┐     MCP      ┌─────────────┐
│  AI Agent   │◄────────────►│ MCP Server  │
│  (Cursor)   │              │  (ваш код)  │
└─────────────┘              └─────────────┘
                                   │
                         ┌─────────┴─────────┐
                         │  Tools/Resources  │
                         │  Prompts          │
                         └───────────────────┘
```

## Три примитива MCP

| Примитив | Что делает | Пример |
|----------|------------|--------|
| **Tools** | Выполняют действия | `search_1c_docs()`, `get_metadata()` |
| **Resources** | Дают данные AI | Файлы конфигурации, код модулей |
| **Prompts** | Шаблоны промптов | "Проанализируй этот запрос 1С" |

## SDK

MCP поддерживает множество языков:
- TypeScript, Python, Java, Kotlin, C#, Go, PHP, Ruby, Rust, Swift
- Hosted by Linux Foundation

## MCP для 1С

См. [[1С MCP серверы]]

## Источники

- [modelcontextprotocol.io](https://modelcontextprotocol.io)
- [GitHub: modelcontextprotocol](https://github.com/modelcontextprotocol)
- [FastMCP](https://go.fastmcp.com)
