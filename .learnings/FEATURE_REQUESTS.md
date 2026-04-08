# FEATURE_REQUESTS.md — Запросы функций

Формат записей:

```markdown
## [FEAT-YYYYMMDD-XXX] capability_name

**Logged**: ISO-8601 timestamp
**Priority**: medium
**Status**: pending | in_progress | resolved | wont_fix
**Area**: frontend | backend | infra | tests | docs | config

### Requested Capability
Что хотел сделать пользователь

### User Context
Почему это было нужно, какую проблему решал

### Complexity Estimate
simple | medium | complex

### Suggested Implementation
Как это можно реализовать

### Metadata
- Frequency: first_time | recurring
- Related Features: existing_feature_name
```

---

## Пример записи:

## [FEAT-20260314-001] automatic_learning_capture

**Logged**: 2026-03-14T18:15:00Z
**Priority**: medium
**Status**: pending
**Area**: config

### Requested Capability
Автоматическая запись learnings без явного указания

### User Context
Пользователь хочет, чтобы агент сам решал, когда записать learning, без необходимости просить явно

### Complexity Estimate
medium

### Suggested Implementation
- Hook на PostToolUse для ошибок
- Анализ коррекций от пользователя в чате
- Периодическая проверка при heartbeat

---
