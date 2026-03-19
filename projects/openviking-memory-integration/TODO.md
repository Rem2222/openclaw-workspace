# TODO: Интеграция OpenViking как семантической памяти для OpenClaw

## 🎯 Цель
Создать скилл `openviking-memory`, который позволяет OpenClaw использовать OpenViking как семантическую долгосрочную память.

---

## 📋 Статус задач

### ⏸️ ПРОЕКТ НА ПАУЗЕ

**Приостановлен:** 2026-03-17 13:50 MSK  
**Причина:** Проблема с блокировкой векторной базы

```
IO error: lock /home/rem/.openviking/workspace/vectordb/context/store/LOCK
```

**Решение:** Остановить VikingBot gateway перед запуском скриптов

---

## 🔧 Итеративный план реализации

### Итерация 1: Остановить VikingBot gateway и протестировать базовый функционал

**Время:** ~10 минут  
**Статус:** ⏳ В ожидании

**Задача:**
1. Остановить VikingBot gateway
2. Протестировать скрипт `ov_search`
3. Убедиться, что семантический поиск работает

**Команды:**
```bash
# 1. Остановить VikingBot gateway
pkill -f "vikingbot gateway"

# 2. Проверить что gateway остановлен
ps aux | grep vikingbot

# 3. Протестировать ov_store
~/.openclaw/skills/openviking-memory/scripts/ov_store "Меня зовут Роман. Я программист 1С." "Личность" "2026-03-17"

# 4. Протестировать ov_search
~/.openclaw/skills/openviking-memory/scripts/ov_search "как меня зовут" 3

# 5. Протестировать ov_read (если есть URI)
~/.openclaw/skills/openviking-memory/scripts/ov_read "viking://resources/..." overview

# 6. Протестировать ov_list
~/.openclaw/skills/openviking-memory/scripts/ov_list

# 7. Запустить VikingBot gateway обратно (опционально)
source ~/.openviking/venv/bin/activate && vikingbot gateway &
```

**Критерий успеха:**
- [ ] ✅ Скрипт `ov_search` работает без ошибок блокировки
- [ ] ✅ Поиск находит сохранённый контент по смыслу
- [ ] ✅ Все скрипты возвращают ожидаемые результаты

---

### Итерация 2: Создать Python-клиент для OpenViking

**Время:** ~30 минут  
**Статус:** ⏳ В ожидании

**Задача:**
Создать модульный Python-клиент, который можно импортировать в скиллы OpenClaw.

**Файл:** `~/.openclaw/skills/openviking-memory/lib/openviking_client.py`

**Структура:**
```python
class OpenVikingMemory:
    def __init__(self, workspace_path="~/.openviking/workspace"):
        # Инициализация клиента OpenViking
        pass
    
    def store(self, text: str, topic: str = "Memory", date: str = None) -> str:
        # Сохранить текст в OpenViking
        # Returns: URI сохранённого ресурса
        pass
    
    def search(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        # Семантический поиск
        # Returns: Список результатов с URI и score
        pass
    
    def read(self, uri: str, level: str = "overview") -> str:
        # Прочитать контент по URI
        # level: "abstract", "overview", "read"
        # Returns: Контент ресурса
        pass
    
    def list(self, path: str = "viking://resources/", recursive: bool = False) -> List[Dict]:
        # Список ресурсов
        # Returns: Список ресурсов
        pass
    
    def close(self):
        # Закрыть клиент
        pass
```

**Тестирование:**
```bash
source ~/.openviking/venv/bin/activate

python3 << 'PYEOF'
import sys
sys.path.insert(0, '/home/rem/.openclaw/skills/openviking-memory/lib')
from openviking_client import OpenVikingMemory

memory = OpenVikingMemory()

# Тест store
uri = memory.store("Тестовый контент", "Тест", "2026-03-17")
print(f"URI: {uri}")

# Тест search
results = memory.search("тест", top_k=3)
print(f"Найдено: {len(results)} результатов")

# Тест read
content = memory.read(uri, level="overview")
print(f"Контент: {content[:100]}...")

# Тест list
resources = memory.list()
print(f"Ресурсов: {len(resources)}")

memory.close()
PYEOF
```

**Критерий успеха:**
- [ ] ✅ Клиент можно импортировать из Python
- [ ] ✅ Все методы работают корректно
- [ ] ✅ Тесты проходят без ошибок

---

### Итерация 3: Создать скилл `openviking-memory` для OpenClaw

**Время:** ~30 минут  
**Статус:** ⏳ В ожидании

**Задача:**
Создать скилл, который можно использовать в OpenClaw через `memory_search` и `memory_get`.

**Структура скилла:**
```
~/.openclaw/skills/openviking-memory/
├── SKILL.md                          # Документация скилла
├── lib/
│   └── openviking_client.py          # Python-клиент
└── scripts/
    ├── ov_store                      # Сохранение контента
    ├── ov_search                     # Семантический поиск
    ├── ov_read                       # Чтение контента
    └── ov_list                       # Список ресурсов
```

**Файл:** `~/.openclaw/skills/openviking-memory/SKILL.md`

**Содержимое:**
```markdown
# SKILL: openviking-memory

## Описание
Скилл для интеграции OpenViking как семантической долгосрочной памяти для OpenClaw.

## Инструменты

### ov_store — Сохранение контента
```bash
ov_store "Текст" "Тема" "Дата"
```

### ov_search — Семантический поиск
```bash
ov_search "Запрос" [Количество]
```

### ov_read — Чтение контента
```bash
ov_read "URI" [Уровень]
# Уровень: abstract, overview, read
```

### ov_list — Список ресурсов
```bash
ov_list [Путь] [Рекурсивно]
```

## Примеры использования

```bash
# Сохранить личную информацию
ov_store "Меня зовут Роман. Я программист 1С." "Личность" "2026-03-17"

# Найти информацию по смыслу
ov_search "как меня зовут" 3

# Прочитать сохранённый контент
ov_read "viking://resources/abc123" overview
```
```

**Критерий успеха:**
- [ ] ✅ Скилл имеет документацию в SKILL.md
- [ ] ✅ Все скрипты работают корректно
- [ ] ✅ Скилл можно использовать из OpenClaw

---

### Итерация 4: Интегрировать с `memory_search` и `memory_get`

**Время:** ~40 минут  
**Статус:** ⏳ В ожидании

**Задача:**
Добавить опцию `--engine openviking` в существующие инструменты `memory_search` и `memory_get`.

**Файл:** `~/.openclaw/skills/memory-search/SKILL.md` (если существует)

**Изменения:**
```bash
# Сейчас
memory_search "как меня зовут"  # Только файловый поиск

# После интеграции
memory_search "как меня зовут" --engine openviking  # Семантический поиск
memory_search "как меня зовут" --engine file         # Файловый поиск (по умолчанию)
memory_search "как меня зовут" --engine hybrid       # Гибридный поиск
```

**Файл:** `~/.openclaw/skills/memory-get/SKILL.md` (если существует)

**Изменения:**
```bash
# Сейчас
memory_get "memory/2026-03-17.md"  # Только файлы

# После интеграции
memory_get "memory/2026-03-17.md"                     # Файл
memory_get "viking://resources/abc123" --level overview  # OpenViking URI
```

**Критерий успеха:**
- [ ] ✅ `memory_search` поддерживает `--engine openviking`
- [ ] ✅ `memory_get` поддерживает URI в формате `viking://`
- [ ] ✅ Обратная совместимость сохранена

---

### Итерация 5: Настроить авто-сохранение сессий

**Время:** ~20 минут  
**Статус:** ⏳ В ожидании

**Задача:**
Настроить автоматическое сохранение контекста сессий в OpenViking через HEARTBEAT.md.

**Файл:** `~/.openclaw/workspace/HEARTBEAT.md`

**Добавить:**
```markdown
## Авто-сохранение в OpenViking

### При каждом heartbeat (если прошло >1 часа)
```bash
# Сохранить контекст текущей сессии
ov_store "$(cat memory/2026-03-17-*.md)" "Session Context" "$(date +%Y-%m-%d)"
```

### Вечером (при "на сегодня достаточно")
```bash
# Архивировать день
ov_store "$(cat memory/2026-03-17-*.md)" "Daily Archive" "$(date +%Y-%m-%d)"
```
```

**Тестирование:**
```bash
# Тестовое сохранение
ov_store "Тестовый контекст сессии" "Session Context" "$(date +%Y-%m-%d)"

# Проверка что сохранилось
ov_search "тестовый контекст" 3
```

**Критерий успеха:**
- [ ] ✅ Контекст сессии автоматически сохраняется в OpenViking
- [ ] ✅ Можно найти сохранённый контекст через семантический поиск
- [ ] ✅ Авто-сохранение не влияет на производительность

---

### Итерация 6: Тестирование полного цикла

**Время:** ~20 минут  
**Статус:** ⏳ В ожидании

---

### Итерация 7: Создать просмотрщик информации внутри OpenViking

**Время:** ~40 минут  
**Статус:** 🆕 Новая задача

**Задача:**
Создать CLI-инструмент для навигации и просмотра информации внутри OpenViking.

**Функционал:**
- Поиск по ресурсам с фильтрами (дата, тема, категория)
- Просмотр L0/L1/L2 уровней
- Навигация по иерархии ресурсов
- Статистика (количество ресурсов, размер данных)

**Файл:** `~/.openclaw/skills/openviking-memory/scripts/ov_browse`

**Пример использования:**
```bash
# Просмотр всех ресурсов
ov_browse

# Поиск по теме
ov_browse --query "интеграция"

# Фильтр по дате
ov_browse --date "2026-03-17"

# Просмотр конкретного ресурса
ov_browse --uri "viking://resources/memory-3cdb85a9" --level overview
```

**Критерий успеха:**
- [ ] ✅ Инструмент показывает список ресурсов
- [ ] ✅ Поддерживает поиск и фильтрацию
- [ ] ✅ Позволяет просматривать контент на разных уровнях

**Задача:**
Протестировать полный цикл работы с семантической памятью.

**Тестовый сценарий:**
```bash
# 1. Сохранить личную информацию
ov_store "Меня зовут Роман. Я программист 1С и руководитель отдела разработчиков." "Личность" "2026-03-17"

# 2. Сохранить контекст сессии
ov_store "Обсуждали интеграцию OpenViking как семантической памяти." "Контекст" "2026-03-17"

# 3. Семантический поиск
ov_search "как меня зовут" 3
ov_search "программирование 1С" 3
ov_search "интеграция OpenViking" 3

# 4. Чтение сохранённого контента
ov_read "viking://resources/..." overview

# 5. Список всех ресурсов
ov_list

# 6. Проверка что VikingBot gateway не блокирует
pkill -f "vikingbot gateway"
ov_search "тест" 3
```

**Критерий успеха:**
- [ ] ✅ Все тесты проходят корректно
- [ ] ✅ Семантический поиск находит информацию по смыслу
- [ ] ✅ VikingBot gateway не блокирует работу скилла

---

## 📊 Общий план

| Итерация | label | Задача | Время | Статус |
|----------|-------|--------|-------|--------|
| 1 | `itest-baselines` | Базовые тесты скриптов | 10 мин | ✅ Завершена |
| 2 | `icreate-client` | Создание Python-клиента | 30 мин | ⏳ В процессе |
| 3 | `icreate-skill` | Создание скилла для OpenClaw | 30 мин | ⏳ В ожидании |
| 4 | `iintegrate-search` | Интеграция с memory_search/memory_get | 40 мин | ⏳ В ожидании |
| 5 | `iauto-save` | Настройка авто-сохранения | 20 мин | ⏳ В ожидании |
| 6 | `itest-full` | Полные интеграционные тесты | 20 мин | ⏳ В ожидании |

**Общее время:** ~2.5 часа

**Naming convention:**
- `itest-` — тестирование
- `icreate-` — создание компонентов
- `iintegrate-` — интеграция
- `iauto-` — автоматизация

---

## 📝 Примечания

### Проблема с блокировкой

**Причина:** VikingBot gateway удерживает блокировку на векторной базе

**Решение:** Остановить VikingBot gateway перед запуском скриптов

```bash
# Остановить VikingBot gateway
pkill -f "vikingbot gateway"

# Проверить что остановлен
ps aux | grep vikingbot
```

### Путь к проекту

**Проект:** `/home/rem/.openclaw/workspace/projects/openviking-memory-integration/`

**Скилл:** `~/.openclaw/skills/openviking-memory/`

**OpenViking:** `~/.openviking/`

---

**Дата создания:** 2026-03-17  
**Последнее обновление:** 2026-03-17 16:43 MSK  
**Статус:** ⏸️ ПАУЗА — ждёт начала Итерации 1  
**Приоритет:** Высокий
