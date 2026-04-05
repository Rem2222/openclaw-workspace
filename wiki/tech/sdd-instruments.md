# SDD Инструменты — Сравнение

## Сравнительная таблица

```
Инструмент      | Тип         | Spec-anchored | Spec-as-source | Сложность | Lock-in
----------------|-------------|---------------|----------------|-----------|----------
Kiro            | VS Code     | ❌            | ❌             | Низкая    | VS Code only
Spec-kit        | CLI         | ❌*           | ❌             | Высокая   | GitHub-centric
Tessl           | CLI + MCP   | ✅            | ✅ (future)    | Средняя   | Нет
OpenSpec        | CLI         | ❌            | ❌             | Низкая    | Нет
```

*Spec-kit создаёт branch на spec, но неясно хранится ли он долгосрочно

## 1. Kiro

**Сайт:** kiro.dev  
**Тип:** VS Code extension  
**Workflow:** Requirements → Design → Tasks

### Плюсы
- Простой, минимум файлов (3 маркдаун-файла)
- User Stories в формате "As a... When... Then..."
- Встроенный memory bank (steering)

### Минусы
- Слишком многословен даже для мелких задач (16 acceptance criteria на баг)
- Только VS Code

---

## 2. Spec-kit

**Сайт:** github.com/github/spec-kit  
**Тип:** CLI  
**Workflow:** Constitution → Specify → Plan → Tasks

### Плюсы
- Максимально кастомизируемый
- Работает с Cursor, Claude, Windsurf и др.
- Constitution как immutable rules

### Минусы
- Очень много markdown-файлов для ревью
- Избыточно для маленьких задач
- GitHub-centric

---

## 3. Tessl

**Сайт:** docs.tessl.io  
**Тип:** CLI + MCP server  
**Статус:** Private beta

### Плюсы
- Единственный aspirирует к spec-anchored/spec-as-source
- Spec = primary artifact, код генерируется
- MCP server встроен

### Минусы
- 1:1 mapping spec → file (низкий уровень абстракции)
- Недетерминирован (та же спека = разный код)
- Beta статус

---

## 4. OpenSpec

**Сайт:** openspec.pro, github.com/Fission-AI/OpenSpec  
**Тип:** CLI (MIT license)  
**Workflow:** proposal → specs → design → tasks → archive

### Плюсы
- Универсальный (20+ AI assistants)
- Легковесный (3 команды)
- Работает с brownfield проектами
- **Не требует API ключей и MCP**
- Fluid workflow (можно редактировать в любой момент)

### Минусы
- Относительно новый

### Установка
```bash
npm install -g @fission-ai/openspec@latest
cd your-project
openspec init
```

### Команды
- `/opsx:propose` — начать изменение
- `/opsx:apply` — выполнить таски
- `/opsx:archive` — заархивировать

---

## Критика (Martin Fowler)

> "Я бы лучше ревьюил код, чем все эти markdown-файлы"

1. **Слишком много ревью** — markdown-файлы утомительны
2. **Ложное чувство контроля** — AI не всегда следует инструкциям
3. **Размер задач** — ни один инструмент не подходит для задач разного размера
4. **Параллель с MDD** — spec-as-source напоминает model-driven development 2000-х

## Что выбрать

| Сценарий | Рекомендация |
|----------|--------------|
| Быстрые прототипы | Без SDD или Kiro |
| Средние фичи | OpenSpec |
| Крупный проект с командой | OpenSpec + Constitution |
| Долгосрочная поддержка | Tessl (когда созреет) |
