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

## [2026-04-08] ingest | NaiveProxy Guide

- Источник: gist swrneko + GitHub klzgrad/naiveproxy
- Создан [[NaiveProxy]] (wiki/tech/naiveproxy.md) — полная инструкция по установке
- Сохранён raw-источник: raw/naiveproxy-guide-swrneko.md
- Обновлён index.md и log.md
- Добавлены клиенты: v2rayN, NekoRay, NekoBox
- Добавлены хостинг-провайдеры: RuVDS, 62yun, Zomro, Reg.ru

## [2026-04-08] ingest | Cursor Proxy Fix

- Источник: forwarded message от Дарт Вейдер
- Создан [[Cursor Proxy Fix]] (wiki/tech/cursor-proxy-fix.md)
- Сохранён raw-источник: raw/cursor-proxy-fix.md
- Обновлён index.md и log.md
- Добавлены: OneXRay, Hiddify, VLESS, HTTP/2 fix для Cursor

## [2026-04-09] ingest | Heisenberg Team

- Источник: https://github.com/ai-operacionka/heisenberg-team-GPT
- Создан [[Heisenberg Team]] (wiki/tech/heisenberg-team-gpt.md)
- 8 агентов, 34 скилла, Board-First протокол
- Обновлён index.md и log.md
- Статус: на рассмотрении
