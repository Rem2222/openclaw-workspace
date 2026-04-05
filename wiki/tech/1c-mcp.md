# 1С MCP Серверы

## Готовые MCP серверы (vibecoding1c.ru)

| № | Сервер | Порт | Что делает |
|---|--------|------|------------|
| 1 | HelpSearchServer | 8003 | Поиск по справке платформы 1С (RAG) |
| 2 | Graph Metadata Search | 8006 | Граф связей метаданных |
| 3 | CodeMetadataSearchServer | 8000 | Поиск по коду и метаданным |
| 4 | SSLSearchServer | 8008 | Поиск по БСП |
| 5 | SyntaxCheckServer | 8002 | Проверка синтаксиса BSL |
| 6 | TemplatesSearchServer | 8004 | Шаблоны кода + память |
| 7 | 1CCodeChecker | 8007 | Глубокое ревью через 1С:Напарник |
| 8 | FormsServer | 8011 | Генерация форм 1С |

**Все в Docker** — `docker run` и работает.

## Коллекция Untru/1c-mcp

**GitHub:** github.com/Untru/1c-mcp

### Метаданные и анализ
- `1c-mcp` (EDT plugin) — навигация, анализ кода
- `mcp-1c-metadata` — REST API для метаданных
- `1c-mcp-graph` — Neo4j граф связей

### Поиск и RAG
- `help-mcp` — справка платформы
- `1c-help-search` — RAG с Qdrant
- `1c-elasticsearch-search` — Elasticsearch

### Тестирование
- `yaxunit-mcp` — запуск тестов
- `bsl-ls-mcp` — LSP → MCP транслятор

### Интеграции
- `1c-naparnik-mcp` — чат с 1С:Напарник
- `1c-buh-mcp` — интеграция с Бухгалтерией

## Как работает MCP Server (Python + FastMCP)

```python
# Установка
pip install mcp

# Простой пример
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("my_1c_server")

@mcp.tool()
def search_1c_docs(query: str) -> str:
    """Поиск по документации 1С"""
    return results

@mcp.tool()
def get_metadata(config_path: str) -> dict:
    """Получить метаданные конфигурации"""
    return metadata

# Запуск
mcp.run(transport="stdio")
```

## cursor_rules_1c

**GitHub:** github.com/comol/cursor_rules_1c

- 11 AI-агентов (архитектор, разработчик, ревьювер и др.)
- 24+ скиллов для форм, запросов, шаблонов, ролей
- Антипаттерны 1С
- SDD-интеграции
- MCP подключения

## Быстрый старт

```bash
# HelpSearchServer — поиск по справке
docker run -p 8003:8000 vibecoding/helps...

# SyntaxCheckServer — проверка синтаксиса  
docker run -p 8002:8000 vibecoding/syntaxcheck...
```

## Полезные ссылки

- [vibecoding1c.ru/mcp_server](https://vibecoding1c.ru/mcp_server)
- [github.com/Untru/1c-mcp](https://github.com/Untru/1c-mcp)
- [modelcontextprotocol.io](https://modelcontextprotocol.io)
