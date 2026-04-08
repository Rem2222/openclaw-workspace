## lossless-claw: Анализ внедрения

**Дата:** 2026-03-24  
**Версия плагина:** @martian-engineering/lossless-claw@0.2.6  
**Путь:** /home/rem/.openclaw/extensions/lossless-claw  
**База:** /home/rem/.openclaw/lcm.db (37 страниц, ~150KB)

---

### Что такое lossless-claw

Плагин заменяет стандартный sliding-window компактер OpenClaw на DAG-based систему суммаризации:
- Все сообщения сохраняются в SQLite
- Старые сообщения суммаризируются в summary-ноды
- Ноды формируют DAG (leaf summaries → condensed summaries)
- `lcm_grep`, `lcm_describe`, `lcm_expand_query` — инструменты для поиска в истории
- ownsCompaction: true (LCM сам управляет компакцией)

---

### Автоматически работает:

- ✅ **Плагин загружен** — gateway status показывает `[plugins] [lcm] Plugin loaded (enabled=true, db=/home/rem/.openclaw/lcm.db, threshold=0.75)`
- ✅ **Инструменты lcm_grep, lcm_describe, lcm_expand, lcm_expand_query зарегистрированы** и доступны агенту (видны в systemPromptReport.tools.entries)
- ✅ **База данных lcm.db существует** и содержит данные (37 pages)
- ✅ **memory_search** — встроенный инструмент OpenClaw (отдельная система от LCM, использует sources: ["memory", "sessions"], provider: "local")
- ✅ **hooks.internal.session-memory** — включен в конфиге ( `{ enabled: true }` )

---

### Может работать (нужно настроить):

#### 1. Контекстный движок LCM ✅ РАБОТАЕТ

**Статус:** `plugins.slots.contextEngine` выставлен в `"lossless-claw"` — LCM активен!

В конфиге:
```json
"plugins": {
  "slots": {
    "contextEngine": "lossless-claw"
  },
  "entries": {
    "lossless-claw": {
      "enabled": true,
      "config": {
        "freshTailCount": 32,
        "contextThreshold": 0.75,
        "incrementalMaxDepth": -1
      }
    }
  }
}
```

По умолчанию OpenClaw использует `contextEngine: "legacy"` (sliding window). Плагин регистрируется через `api.registerContextEngine("lossless-claw", ...)`, но без слота он не выбирается.

**Как настроить:**
```json
"plugins": {
  "slots": {
    "contextEngine": "lossless-claw"
  }
}
```
После этого LCM будет перехватывать ingest/afterTurn/compact и управлять компакцией.

#### 2. Порог contextThreshold

Текущий threshold=0.75 означает компакция запустится когда контекст достигнет 75% окна. Для MiniMax M2.7 (200k контекст) это ~160k токенов. В тесте контекст был на ~32% — поэтому LCM не нашёл данных для текущей сессии.

**Можно понизить** если сессии длинные и важно раньше архивировать.

---

### Работает только вручную:

- **`lcm_grep`** — поиск по ключевым словам/регексу в сообщениях и summary
  ```
  lcm_grep(pattern: "база данных", mode: "full_text", allConversations: true)
  ```
- **`lcm_describe`** — детали конкретной summary (sum_xxx)
  ```
  lcm_describe(id: "sum_abc123def456")
  ```
- **`lcm_expand_query`** — глубокий поиск с sub-agent для раскрытия деталей из DAG
  ```
  lcm_expand_query(query: "исправление OAuth", prompt: "В чём была причина?")
  ```

**Важно:** Эти инструменты работают только если есть скомпактированные данные. Для новой сессии вернут пусто.

---

### Не работает / не внедрено:

- ❌ **LCM как контекстный движок** — `plugins.slots.contextEngine` не выставлен, используется legacy
- ❌ **Автоматическая компакция сессий** — т.к. контекстный движок не LCM, автоматическая DAG-компакция не происходит
- ❌ **Автодобавление контекста из LCM** — в normal operation LCM должен сам добавлять relevant memory в промпт, но без слота это не работает
- ❌ **Интеграция с memory_search** — `memorySearch` в конфиге это отдельная встроенная система (не LCM), sources: ["memory", "sessions"] — это файловая память OpenClaw, не LCM-поиск

---

### Рекомендации:

#### Критично (для работы LCM):

**1. Добавить слот contextEngine:**

```json
"plugins": {
  "slots": {
    "contextEngine": "lossless-claw"
  },
  "entries": {
    "lossless-claw": {
      "enabled": true,
      "config": {
        "freshTailCount": 32,
        "contextThreshold": 0.75,
        "incrementalMaxDepth": -1
      }
    }
  }
}
```

После этого перезапустить gateway: `openclaw gateway restart`

**2. Увеличить session lifetime** чтобы сессии доживали до компакции:

```json
"session": {
  "maintenance": {
    "mode": "enforce",
    "pruneAfter": "30d",
    "maxEntries": 2000,
    "rotateBytes": "50mb"
  }
}
```

#### Опционально:

**3. Добавить подсказки в системный промпт** чтобы агент знал про LCM-инструменты:

```
## Memory & Context
Use LCM tools for recall:
1. `lcm_grep` — Search all conversations by keyword/regex
2. `lcm_describe` — Inspect a specific summary (cheap, no sub-agent)  
3. `lcm_expand_query` — Deep recall with sub-agent expansion
```

**4. Включить FTS5** для быстрого полнотекстового поиска (документация: docs/fts5.md)

**5. memorySearch** — если нужен именно файловый поиск, он работает и так. Но это отдельная система от LCM.

---

### Текущее состояние в картинке:

```
[OpenClaw runtime]
        │
        ▼
┌───────────────────────┐
│  Legacy Context Engine │ ◄── АКТИВЕН (slots.contextEngine не задан)
│  (sliding window)      │
└───────────────────────┘
        │
        ▼ (только tools)
┌───────────────────────┐
│  lossless-claw plugin │ ◄── ЗАГРУЖЕН (tools зарегистрированы)
│  lcm_grep etc.        │     но как CONTEXT ENGINE — НЕ активен
│  db: lcm.db           │
└───────────────────────┘

После настройки slots.contextEngine = "lossless-claw":
┌───────────────────────┐
│  LCM Context Engine   │ ◄── АКТИВЕН
│  (DAG summarization)  │
└───────────────────────┘
```
