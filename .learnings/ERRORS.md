# ERRORS.md — Ошибки и сбои

Формат записей:

```markdown
## [ERR-YYYYMMDD-XXX] skill_or_command_name

**Logged**: ISO-8601 timestamp
**Priority**: high
**Status**: pending | in_progress | resolved | wont_fix
**Area**: frontend | backend | infra | tests | docs | config

### Summary
Краткое описание того, что сломалось

### Error
```
Фактическое сообщение об ошибке
```

### Context
- Команда/операция
- Входные параметры
- Детали окружения

### Suggested Fix
Если понятно, что может решить проблему

### Metadata
- Reproducible: yes | no | unknown
- Related Files: path/to/file.ext
- See Also: ERR-20250110-001
```

---

## Пример записи:

## [ERR-20260314-001] duckduckgo_search

**Logged**: 2026-03-14T16:50:00Z
**Priority**: high
**Status**: pending
**Area**: config

### Summary
Модуль duckduckgo_search не найден

### Error
```
ModuleNotFoundError: No module named 'duckduckgo_search'
```

### Context
- Пакет был установлен через `pip install duckduckgo-search`
- Python 3.12.3
- OpenClaw workspace

### Suggested Fix
- Проверить путь к pip
- Установить через `python3 -m pip install duckduckgo-search --user`

---
