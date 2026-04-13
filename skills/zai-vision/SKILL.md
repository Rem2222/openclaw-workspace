---
name: zai-vision
description: Анализ изображений через Z.AI Vision MCP Server. OCR, диагностика ошибок, анализ графиков и диаграмм.
trigger: /zai-vision
---

# /zai-vision

Анализ изображений через Z.AI Vision MCP Server (`@z_ai/mcp-server`).

## Доступные инструменты

| Инструмент | Что делает |
|-----------|-----------|
| `analyze_image` | Общее описание картинки |
| `extract_text_from_screenshot` | OCR — извлечение текста со скриншота |
| `diagnose_error_screenshot` | Диагностика ошибок на скриншоте |
| `understand_technical_diagram` | Анализ технических диаграмм (flowchart, UML, архитектура) |
| `analyze_data_visualization` | Анализ графиков, дашбордов, чартов |
| `ui_diff_check` | Сравнение двух UI скриншотов |
| `ui_to_artifact` | Конвертация UI в код/промпты/описания |
| `analyze_video` | Анализ видео |

## Использование

Вызови напрямую через exec:
```bash
Z_AI_API_KEY=твой_ключ python3 ~/.openclaw/workspace/skills/zai-vision/scripts/analyze.py <tool> <image_path> [prompt]
```

**Примеры:**

```bash
# Описать картинку
python3 ~/.openclaw/workspace/skills/zai-vision/scripts/analyze.py analyze_image /path/to/screenshot.png "Что на этой картинке?"

# OCR текст
python3 ~/.openclaw/workspace/skills/zai-vision/scripts/analyze.py extract_text_from_screenshot /path/to/screenshot.png

# Диагностика ошибок
python3 ~/.openclaw/workspace/skills/zai-vision/scripts/analyze.py diagnose_error_screenshot /path/to/error.png

# Анализ графика
python3 ~/.openclaw/workspace/skills/zai-vision/scripts/analyze.py analyze_data_visualization /path/to/chart.png "Какие данные показаны?"
```

## Как работает

1. Скрипт `scripts/analyze.py` спавнит `npx @z_ai/mcp-server@latest` как subprocess
2. Отправляет JSON-RPC initialize → получаем список tools
3. Вызывает нужный tool с путём к картинке
4. Z.AI MCP Server отправляет картинку в Z.AI Vision API
5. Результат возвращается в чат

**Время ответа:** 10-30 секунд (зависит от размера файла и сложности анализа)

## Требования

- Node.js >= v22 (`node --version`)
- `npx` доступен в PATH
- Z.AI API key с балансом для Vision

**API Key:** Уже настроен в `scripts/analyze.py` (или через переменную `Z_AI_API_KEY`)

## Если не работает

1. Проверь Node.js: `node --version` (нужен >= v22)
2. Проверь npx: `which npx`
3. Проверь API key: баланс на z.ai
4. Попробуй локальный файл вместо URL

## Для быстрого теста

```bash
Z_AI_API_KEY=<key> python3 scripts/analyze.py analyze_image /tmp/test.png "Опиши картинку"
```
