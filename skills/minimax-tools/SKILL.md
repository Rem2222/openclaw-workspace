# MiniMax Tools Skill

**Скилл для доступа к инструментам MiniMax MCP сервера через mcporter.**

## Инструменты

### web_search(query)
Поиск в интернете через MiniMax API.

**Использование:**
```bash
mcporter call 'minimax.web_search(query: "запрос")'
```

**Примеры:**
- Поиск новостей: `mcporter call 'minimax.web_search(query: "AI новости 2025")'`
- Поиск информации: `mcporter call 'minimax.web_search(query: "как работает Docker")'`

**Возвращает:**
```json
{
  "organic": [
    {
      "title": "Заголовок",
      "link": "https://...",
      "snippet": "Краткое описание",
      "date": "дата"
    }
  ],
  "related_searches": [...],
  "base_resp": {
    "status_code": 0,
    "status_msg": "success"
  }
}
```

---

### understand_image(prompt, image_source)
Анализ изображений через MiniMax Vision API.

**Использование:**
```bash
mcporter call 'minimax.understand_image(prompt: "что нужно узнать", image_source: "URL или путь к файлу")'
```

**Примеры:**
- Анализ по URL: `mcporter call 'minimax.understand_image(prompt: "опиши что на картинке", image_source: "https://example.com/image.jpg")'`
- Локальный файл: `mcporter call 'minimax.understand_image(prompt: "распознай текст", image_source: "/home/user/image.png")'`
- Относительный путь: `mcporter call 'minimax.understand_image(prompt: "что это", image_source: "images/photo.jpg")'`

**Важно:**
- Поддерживаемые форматы: JPEG, PNG, WebP
- Не поддерживаются: PDF, GIF, PSD, SVG
- Если путь начинается с @, уберите @ перед передачей

**Возвращает:**
Текстовое описание анализа изображения.

---

## Настройка

Скилл требует:
1. mcporter установленный и настроенный
2. MiniMax MCP сервер добавлен в mcporter config

**Конфигурация mcporter:** `~/.openclaw/workspace/config/mcporter.json`
```json
{
  "mcpServers": {
    "minimax": {
      "command": "/home/rem/.local/bin/uvx",
      "args": ["minimax-coding-plan-mcp"],
      "env": {
        "MINIMAX_API_KEY": "твой_ключ",
        "MINIMAX_API_HOST": "https://api.minimax.io"
      }
    }
  }
}
```

---

## Команды mcporter

**Проверить статус:**
```bash
mcporter list minimax
```

**Показать все серверы:**
```bash
mcporter config list
```

**Тестировать инструменты:**
```bash
# Поиск
mcporter call 'minimax.web_search(query: "test")'

# Изображения
mcporter call 'minimax.understand_image(prompt: "describe", image_source: "https://httpbin.org/image/png")'
```
