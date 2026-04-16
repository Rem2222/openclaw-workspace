# Psycho Profile

Психологический анализ текстов Романа на основе переписки с ИИ-ассистентом.

## Быстрый старт

### 1. Извлечь данные (один раз)
```bash
python3 scripts/extract.py
```

### 2. Подготовить промпт
```bash
python3 scripts/run.py --model opus-4.6 --max-tokens 100000
```

### 3. Запустить анализ
Через OpenClaw subagent:
```
Создай subagent с моделью opencode-anthropic/claude-opus-4-6
Задача: "Прочитай файл output/.prompt_opus-4.6.txt и выполни анализ как описано."
```

### 4. Сравнить модели
```bash
python3 scripts/run.py --model sonnet-4.6
python3 scripts/run.py --model gpt-5.4
```

## Доступные модели

| Ключ | Модель | Провайдер |
|------|--------|-----------|
| `opus-4.6` | Claude Opus 4.6 | opencode-anthropic |
| `sonnet-4.6` | Claude Sonnet 4.6 | opencode-anthropic |
| `neko-opus-4.6` | Claude Opus 4.6 (Neko) | neko |
| `gpt-5.4` | GPT-5.4 | opencode-openai |
| `gpt-5.4-neko` | GPT-5.4 (Neko) | neko-openai |
| `glm-5` | GLM-5 | zai |
| `glm-5.1` | GLM-5.1 | zai |
| `minimax-m2.7` | MiniMax M2.7 | minimax |
| `hunter` | Hunter Alpha (1T) | openrouter |
| `kimi` | Kimi K2.5 | openrouter |
| `deepseek` | DeepSeek Chat | deepseek |

## Данные

- **1271 сообщений** пользователя
- **~857K символов** (~214K токенов)
- Период: 2026-04-02 — 2026-04-16
- Источник: JSONL сессий OpenClaw

## Структура

```
projects/psycho-profile/
├── README.md           — этот файл
├── prompts/
│   └── analysis.md     — промпт для анализа
├── scripts/
│   ├── extract.py      — извлечение сообщений
│   └── run.py          — подготовка промпта и запуск
├── data/
│   └── user_messages.jsonl  — извлечённые данные
└── output/
    └── .prompt_*.txt   — подготовленные промпты
```

## Linear

- **REM-35** — основная задача
