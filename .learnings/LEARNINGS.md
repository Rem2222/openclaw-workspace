## [LRN-20260315-001] npm_update_error

**Priority:** low
**Status:** pending

### Проблема
При обновлении OpenClaw использовал `npm update openclaw@latest` — получил ошибку `EUPDATEARGS`.

### Ошибка
```
npm error Update arguments must only contain package names, eg:
npm error Update arguments must only contain package names, eg:
```

### Решение
Использовать `npm install` для установки конкретной версии:

```bash
npm install -g openclaw@latest
```

Или просто `npm update` без версии:

```bash
npm update -g openclaw
```

### Причина
`npm update` не принимает аргументы версии — только имена пакетов. Для установки конкретной версии нужно использовать `npm install`.

### Урок
- `npm update -g package` — обновляет до последней версии
- `npm install -g package@version` — устанавливает конкретную версию

---
