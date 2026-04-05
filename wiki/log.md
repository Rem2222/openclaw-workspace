# Log — Журнал вики

_Append-only. Формат: `## [дата] type | описание`_

---

## [2026-04-05] setup | Создание вики

- Создана структура папок (raw, assets, wiki/{people,tech,projects,concepts,books,misc})
- Создан SCHEMA.md (правила для LLM)
- Создан index.md (каталог)
- Создан этот log.md
- Источник идеи: https://gist.github.com/iAlexeyRu/84a365fe34c3f0a964888a2c09a4541b
- Инструкция добавлена в AGENTS.md

## [2026-04-05] ingest | LLM Wiki (gist)

- Создана страница [[LLM Wiki]] (wiki/concepts/llm-wiki.md)
- Создана страница [[Obsidian]] (wiki/tech/obsidian.md)
- Создана страница [[RAG]] (wiki/concepts/rag.md)
- Обновлён index.md
- 3 страницы, 3 перекрёстные ссылки

## [2026-04-05] ingest | LLM Wiki (полный импорт)

- Сохранён raw-источник: raw/llm-wiki-gist.md
- Обновлена [[LLM Wiki]] (полное содержимое, все связи)
- Создана [[Memex]] (wiki/concepts/memex.md)
- Создан [[qmd]] (wiki/tech/qmd.md)
- Создан [[Obsidian Web Clipper]] (wiki/tech/obsidian-web-clipper.md)
- Создан [[Marp]] (wiki/tech/marp.md)
- Создан [[Dataview]] (wiki/tech/dataview.md)
- Обновлён index.md
- Итого: 9 страниц в wiki, все связаны с [[LLM Wiki]]
