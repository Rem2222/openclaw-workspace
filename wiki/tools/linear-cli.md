---
created: 2026-04-25
tags:
  - cli
  - linear
  - automation
  - git
type: tool
---

# Linear CLI

**GitHub:** github.com/Finesssee/linear-cli

CLI инструмент для Linear. Позволяет управлять задачами, коммитами, линковать GitHub/Lab коммиты к Linear.

## Команды

```bash
# Привязать коммит к Linear issue
linear git-commit "commit message"

# Линковать GitHub PR к Linear
linear git-link --pr 123

# Создать issue из CLI
linear issue create --title "Title" --description "Desc"

# Список своих issues
linear issues list --assignee me
```

## Интеграция с Git

Можно настроить Git hooks для автоматического создания ссылок:
- Pre-commit: проверять что branch name = issue ID
- Post-commit: пушить и линковать к Linear

## Зачем

- Работать с Linear без браузера
- Автоматизировать привязку коммитов к задачам
- Создавать issues из терминала быстро
- LLM агент может дёргать `linear` команду напрямую

## Linear API Key

Нужен API ключ Linear.см. [[calendar-events]] для хранения ключей.

```bash
export LINEAR_API_KEY="lin_api_..."
linear auth # однократно
```

## Статус

[[status.todo]]

## Источник

[[links-from-sessions]]
