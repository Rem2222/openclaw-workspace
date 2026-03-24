# MiniMax Tools

Скилл для доступа к инструментам MiniMax MCP сервера.

## Быстрый старт

```bash
# Поиск в интернете
./scripts/web-search.sh "что искать"

# Анализ изображения
./scripts/understand-image.sh "опиши что на картинке" "https://example.com/image.jpg"
```

## Примеры использования

### Поиск новостей о AI
```bash
./scripts/web-search.sh "искусственный интеллект новости 2025"
```

### Анализ изображения по URL
```bash
./scripts/understand-image.sh "что изображено на фото" "https://httpbin.org/image/jpeg"
```

### Распознавание текста на картинке
```bash
./scripts/understand-image.sh "распознай весь текст" "/путь/к/картинке.png"
```

## Инструменты

| Инструмент | Описание |
|-----------|----------|
| `web_search` | Поиск в интернете |
| `understand_image` | Анализ изображений (JPEG, PNG, WebP) |

## Структура

```
minimax-tools/
├── SKILL.md          # Документация скилла
├── README.md         # Быстрый старт
└── scripts/
    ├── web-search.sh            # Скрипт для поиска
    └── understand-image.sh      # Скрипт для анализа картинок
```

## Требования

- mcporter установлен
- MiniMax MCP сервер настроен в mcporter config

## Документация

Подробная информация в [SKILL.md](./SKILL.md).
