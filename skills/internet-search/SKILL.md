# SKILL.md

# 🔍 Internet Search Skill

## Quick Reference

| Задача | Инструмент | Пример |
|--------|------------|--------|
| **Общий поиск** | Exa Search | `mcporter call 'exa.web_search_exa(query: "вайбкодинг 1С")'` |
| **Чтение статьи** | web_fetch | `web_fetch({"url": "https://habr.com/..."})` |
| **YouTube видео** | yt-dlp | `yt-dlp --dump-json "URL"` |
| **GitHub поиск** | gh CLI | `gh search repos "query"` |
| **RSS лента** | feedparser | `python3 -c "import feedparser; ..."` |

---

## 1️⃣ Общий поиск в интернете

### Exa Search (через mcporter) — **РЕКОМЕНДУЮ**

```bash
# Простой поиск
mcporter call 'exa.web_search_exa(query: "вайбкодинг 1С")'

# С фильтром по времени
mcporter call 'exa.web_search_exa(query: "айсберг", type: "web", filters: ["past_month", "safe"]')
```

**Плюсы:**
- ✅ Семантический поиск, понимает контекст
- ✅ Не требует API ключа
- ✅ Работает стабильно
- ✅ Показывает релевантные результаты

---

### DuckDuckGo через web_fetch

```bash
web_fetch({"url": "https://duckduckgo.com/html/?q=вайбкодинг+1С"})
```

**Плюсы:**
- ✅ Не требует API ключа
- ✅ Приватный поиск

**Минусы:**
- ❌ Нужно парсить HTML
- ❌ Меньше релевантности чем Exa

---

### Google через web_fetch

```bash
web_fetch({"url": "https://www.google.com/search?q=вайбкодинг+1С&tbs=qdr:m"})
```

**Плюсы:**
- ✅ Лучшая релевантность
- ✅ Advanced operators (`site:`, `filetype:`, `-`, `""`)
- ✅ Time filters (`tbs=qdr:w`, `tbs=qdr:m`)

**Минусы:**
- ❌ Может быть капча
- ❌ Нужен парсинг HTML

---

## 2️⃣ Поиск на конкретных платформах

### GitHub

```bash
# Через gh CLI
gh search repos "vibe coding" --topic python

# Через web_fetch
web_fetch({"url": "https://github.com/search?q=vibe+coding&type=repositories"})
```

### YouTube

```bash
# Через yt-dlp (для конкретного видео)
yt-dlp --dump-json "https://youtube.com/watch?v=..."

# Через Exa Search
mcporter call 'exa.web_search_exa(query: "vibe coding site:youtube.com")'
```

### Reddit

```bash
# Через Exa Search
mcporter call 'exa.web_search_exa(query: "vibe coding site:reddit.com")'

# Прямой запрос к API
curl -s "https://www.reddit.com/r/vibe_coding.json" | python3 -m json.tool
```

---

## 3️⃣ Чтение страниц

### web_fetch (основной)

```bash
web_fetch({"url": "https://habr.com/ru/articles/992176/"})
```

### Jina Reader (если web_fetch не справляется)

```bash
curl -s "https://r.jina.ai/https://habr.com/ru/articles/992176/"
```

**Плюсы Jina:**
- ✅ Лучше обрабатывает сложную верстку
- ✅ Возвращает чистый текст

---

## 4️⃣ RSS ленты

```bash
python3 -c "
import feedparser
feed = feedparser.parse('https://habr.com/ru/rss/')
for entry in feed.entries[:5]:
    print(f\"{entry.title} — {entry.link}\")
"
```

---

## 🎯 Стратегия по умолчанию

**Когда ты просишь найти что-то:**

1. **Общий поиск** → Exa Search
2. **Конкретная статья** → web_fetch
3. **YouTube видео** → yt-dlp
4. **GitHub репозиторий** → gh CLI
5. **RSS лента** → feedparser

**Когда ты даёшь ссылку:**

1. **Обычная страница** → web_fetch
2. **Сложная верстка** → Jina Reader
3. **YouTube/Bilibili** → yt-dlp

---

## 🔧 Advanced: multi-search-engine

17 поисковиков в одном файле:

```bash
# Китайские
web_fetch({"url": "https://www.baidu.com/s?wd=вайбкодинг+1С"})

# Международные
web_fetch({"url": "https://www.google.com.hk/search?q=вайбкодинг+1С"})
web_fetch({"url": "https://search.brave.com/search?q=вайбкодинг+1С"})
web_fetch({"url": "https://www.ecosia.org/search?q=вайбкодинг+1С"})

# WolframAlpha (для расчётов)
web_fetch({"url": "https://www.wolframalpha.com/input?i=100+USD+to+RUB"})
```

---

## 📝 Примечания

- **Exa Search** — бесплатный, без API ключа, семантический поиск
- **Jina Reader** — извлекает текст из сложных страниц
- **yt-dlp** — метаданные и субтитры с YouTube/Bilibili
- **gh CLI** — полный доступ к GitHub (нужен токен для записи)
- **multi-search-engine** — 17 поисковиков без API ключей
