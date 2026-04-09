---
title: "MarkItDown"
description: "Microsoft tool for converting documents to Markdown"
tags: [microsoft, markdown, converter, documents, pdf, office, mcp]
related: [[defuddle]], [[mcp]], [[cursor-proxy-fix]]
---

# MarkItDown

**URL:** https://github.com/microsoft/markitdown  
**PyPI:** https://pypi.org/project/markitdown/

## Что это

Python утилита от Microsoft для конвертации различных файлов в Markdown. LLMs хорошо понимают Markdown (особенно GPT-4o "native" его понимает), плюс это экономит токены.

## Поддерживаемые форматы

| Формат | Описание |
|--------|----------|
| PDF | Документы |
| PowerPoint | .pptx |
| Word | .docx |
| Excel | .xlsx |
| Images | OCR + EXIF metadata |
| Audio | Speech transcription + EXIF |
| HTML | Веб-страницы |
| CSV, JSON, XML | Текстовые форматы |
| ZIP | Архивы (распаковывает и конвертирует содержимое) |
| YouTube | Видео по URL |
| EPubs | Электронные книги |

## Установка

```bash
# Создать виртуальное окружение (рекомендуется)
python -m venv .venv
source .venv/bin/activate

# Или через uv
uv venv --python 3.12 .venv
source .venv/bin/activate

# Установка со всеми зависимостями
pip install 'markitdown[all]'

# Только определённые форматы
pip install 'markitdown[pdf,docx,pptx]'
```

## Использование

```bash
# Конвертировать файл в Markdown
markitdown document.pdf > document.md

# С указанием выходного файла
markitdown document.pdf -o document.md

# Pipe через stdin
cat document.pdf | markitdown
```

## Python API

```python
from markitdown import MarkItDown

md = MarkItDown()
result = md.convert("document.pdf")
print(result.text_content)
```

## MCP Server

MarkItDown имеет MCP сервер для интеграции с LLM приложениями (Claude Desktop и т.д.).

**Установка MCP сервера:**
```bash
pip install 'markitdown[mcp]'
```

См. [markitdown-mcp](https://github.com/microsoft/markitdown/tree/main/packages/markitdown-mcp) для настройки.

## MarkItDown vs Defuddle

| | MarkItDown | Defuddle |
|--|------------|----------|
| Назначение | Универсальный конвертер документов | Извлечение markdown из веб-страниц |
| PDF | ✅ | ❌ |
| Office docs | ✅ | ❌ |
| OCR | ✅ | ❌ |
| YouTube | ✅ | ❌ |
| Веб-страницы | ✅ (HTML) | ✅ (лучше) |
| CLI | ✅ | ✅ |

**Когда что использовать:**
- **MarkItDown** — документы, PDF, Office файлы, аудио, YouTube
- **Defuddle** — веб-страницы (лучше для HTML → clean markdown)

## Для чего использовать

1. **Подготовка документов для LLM** — конвертировать PDF/Word в markdown перед отправкой агенту
2. **OCR для сканов** — извлечь текст из картинок
3. **Транскрибация аудио** —MarkItDown может транскрибировать аудио
4. **YouTube в текст** — получить транскрипт из видео
5. **MCP интеграция** — подключить как tool к Claude Desktop

## Примеры

```bash
# PDF документ
markitdown report.pdf -o report.md

# Word файл
markitdown presentation.pptx -o presentation.md

# Извлечь текст из изображения
markitdown scan.jpg -o scan.md

# Транскрипт YouTube видео
markitdown "https://youtube.com/watch?v=..." -o video.md

# Excel таблица
markitdown data.xlsx -o data.md
```

## Статус

✅ Установлен в OpenClaw (pip install)
