---
title: Dataview
type: tech
created: 2026-04-05
updated: 2026-04-05
tags: [obsidian-plugin, query, metadata]
sources: [raw/llm-wiki-gist.md]
related: [[LLM Wiki]], [[Obsidian]]
---

# Dataview

Плагин для [[Obsidian]], который выполняет запросы по метаданным страниц (YAML frontmatter).

## Возможности

- Динамические таблицы и списки на основе frontmatter
- Запросы по тегам, датам, количеству источников
- Автообновление при изменении данных

## Пример

Если LLM добавляет frontmatter (теги, даты, sources) на страницы wiki, Dataview может генерировать:
- Список всех страниц по тегу
- Таблицу страниц по дате добавления
- Подсчёт страниц по категориям

## Связь

Используется в [[LLM Wiki]] для динамической навигации по wiki.
