# LEARNINGS.md — Мои знания и исправления

Формат записей:

```markdown
## [LRN-YYYYMMDD-XXX] category

**Logged**: ISO-8601 timestamp
**Priority**: low | medium | high | critical
**Status**: pending | in_progress | resolved | promoted
**Area**: frontend | backend | infra | tests | docs | config

### Summary
Однострочное описание

### Details
Полный контекст

### Suggested Action
Что сделать

### Metadata
- Source: conversation | error | user_feedback
- Related Files: path/to/file.ext
- Tags: tag1, tag2
- See Also: LRN-20250110-001
```

---

## Пример записи:

## [LRN-20260314-001] openclaw_memory

**Logged**: 2026-03-14T18:00:00Z
**Priority**: medium
**Status**: pending
**Area**: config

### Summary
memorySearch использует периодическую индексацию, не live search

### Details
При добавлении новой записи в MEMORY.md она не сразу доступна через memorySearch. Индексация происходит периодически, не в реальном времени.

### Suggested Action
- Для новых записей ждать индексацию или перезапускать Gateway
- Учитывать задержку при поиске свежих данных

---
